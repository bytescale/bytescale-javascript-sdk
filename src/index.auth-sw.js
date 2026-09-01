/* eslint-disable no-undef */
/**
 * Bytescale Auth Service Worker (SW)
 *
 * This script should be referenced by the "serviceWorkerScript" field in the "AuthManager.beginAuthSession" method of
 * the Bytescale JavaScript SDK to append "Authorization" headers to HTTP requests sent to the Bytescale CDN. This
 * approach serves as an alternative to cookie-based authentication, which is incompatible with certain modern browsers.
 *
 * Documentation:
 * - https://www.bytescale.com/docs/types/BeginAuthSessionParams#serviceWorkerScript
 */
let transientCache; // [{urlPrefix, headers, expires?}] (See: AuthSwConfigDto)
let transientUrlRewriteRules;
const maxSourceUrlCacheEntries = 1000;
const persistentCacheName = "bytescale-sw-config";
const persistentCacheKey = "config";
const persistentUrlRewriteRulesCacheKey = "url-rewrite-rules";
const sourceScopedUrlPrefixMarker = "!bytescale-source-scoped!";
const sourceUrlsByClientId = new Map();

console.log(`[bytescale] Auth SW Registered`);

self.addEventListener("install", function (event) {
  // Typically service workers go: 'installing' -> 'waiting' -> 'activated'.
  // However, we skip the 'waiting' phase as we want this service worker to be used immediately after it's installed,
  // instead of requiring a page refresh if the browser already has an old version of the service worker installed.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function (event) {
  // Immediately allow the service worker to intercept "fetch" events (instead of requiring a page refresh) if this is
  // the first time this service worker is being installed.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", event => {
  // Allows communication with the windows/tabs that have are able to generate the JWT (as they have the auth session with the user's API).
  // See: AuthSwSetConfigDto
  if (event.data) {
    switch (event.data.type) {
      // Auth sessions are started/ended by calling SET_CONFIG with auth config or with 'undefined' config, respectively.
      // We use 'undefined' to end the auth session instead of unregistering the worker, as there may be multiple tabs
      // in the user's application, so while the user may sign out in one tab, they may remain signed in to another tab,
      // which may subsequently send a follow-up 'SET_CONFIG' which will resume auth.
      case "SET_BYTESCALE_AUTH_CONFIG":
        setConfig(event.data.config, event.data.urlRewriteRules).then(
          () => {},
          e => console.error(`[bytescale] Auth SW failed to persist config.`, e)
        );
        break;
    }
  }
});

self.addEventListener("fetch", function (event) {
  // Faster and intercepts only the required requests.
  // Called in almost all cases.
  const interceptSync = config => {
    const newRequest = interceptRequest(event, config, transientUrlRewriteRules);
    if (newRequest instanceof Promise) {
      event.respondWith(
        newRequest.then(
          request => handleRequestErrors(request ?? event.request),
          () => handleRequestErrors(event.request)
        )
      );
    } else if (newRequest !== undefined) {
      event.respondWith(handleRequestErrors(newRequest));
    }
  };

  // Slower and intercepts all requests (while still only rewriting the relevant requests).
  // Called only for the initial request after this Service Worker is restarted after going idle (e.g. after 30s on Firefox/Windows).
  const interceptAsync = async () =>
    await handleRequestErrors(
      (await withTimeout(getState())
        .then(state => (state === undefined ? undefined : interceptRequest(event, state.config, state.urlRewriteRules)))
        .catch(() => undefined)) ?? event.request
    );

  // Makes it clearer to developers that the request failed for normal reasons (not reasons caused by this script).
  const handleRequestErrors = async request => {
    try {
      return await fetch(request);
    } catch (e) {
      throw new Error("Network request failed: see previous browser errors for the cause.");
    }
  };

  // Optimization: avoids running async code (which necessitates intercepting all requests) when the config is already cached locally.
  if (transientCache !== undefined && transientUrlRewriteRules !== undefined) {
    interceptSync(transientCache);
  } else {
    event.respondWith(interceptAsync());
  }
});

function interceptRequest(event, config, urlRewriteRules) {
  const rewrittenUrl = getRewrittenUrl(event.request.url, urlRewriteRules);
  const url = rewrittenUrl === undefined ? event.request.url : rewrittenUrl;
  const fallbackRequest =
    rewrittenUrl === undefined ? undefined : createCorsRequest(event.request, rewrittenUrl, event.request.headers);

  if (config !== undefined) {
    // Config is an array to support multiple different accounts within a single website, if needed.
    for (const { expires, urlPrefix, headers, sourceUrlPrefixes } of config) {
      const makeNewRequest = overwrite => {
        const newHeaders = new Headers(event.request.headers);
        if (overwrite) {
          newHeaders.delete("Authorization");
          newHeaders.delete("Authorization-Token");
        }
        for (const { key, value } of headers) {
          if (overwrite || !newHeaders.has(key)) {
            newHeaders.set(key, value);
          }
        }
        return createCorsRequest(event.request, url, newHeaders);
      };

      if (expires === undefined || expires > Date.now()) {
        const isSourceScoped = sourceUrlPrefixes !== undefined;

        // AuthManager adds the 'sourceScopedUrlPrefixMarker' prefix to the 'urlPrefix' when 'sourceUrlPrefixes' is provided,
        // as this prevents old versions of the service worker (that don't support 'sourceUrlPrefixes') from intercepting the requests,
        // since it would end up intercepting ALL requests, whereas the user's intention is to intercept only source-filtered requests.
        const actualUrlPrefix = isSourceScoped
          ? urlPrefix.startsWith(sourceScopedUrlPrefixMarker)
            ? urlPrefix.substring(sourceScopedUrlPrefixMarker.length)
            : undefined
          : urlPrefix;

        if (
          actualUrlPrefix !== undefined &&
          url.startsWith(actualUrlPrefix) &&
          event.request.method.toUpperCase() === "GET"
        ) {
          if (isSourceScoped) {
            if (!Array.isArray(sourceUrlPrefixes) || sourceUrlPrefixes.length === 0) {
              return fallbackRequest;
            }
            return getSourceUrl(event.clientId).then(sourceUrl => {
              if (sourceUrl === undefined || !sourceUrlPrefixes.some(prefix => sourceUrl.startsWith(prefix))) {
                return fallbackRequest;
              }

              // Overwrite existing auth headers that may have been set by other broad-match authorizers (i.e. AuthManager
              // instances that were configured without any sourceUrlPrefixes specified).
              return makeNewRequest(true);
            });
          }

          // Do not overwrite existing auth headers, as this is a broad-match authorizer (i.e. AuthManager was run
          // without any 'sourceUrlPrefixes' specified), so give priority to AuthManagers where sourceUrlPrefixes is specified.
          return makeNewRequest(false);
        }
      }
    }
  }

  return fallbackRequest;
}

function getRewrittenUrl(url, urlRewriteRules) {
  if (Array.isArray(urlRewriteRules)) {
    for (const rule of urlRewriteRules) {
      if (
        rule !== null &&
        typeof rule === "object" &&
        typeof rule.fromUrlPrefix === "string" &&
        typeof rule.toUrlPrefix === "string" &&
        url.startsWith(rule.fromUrlPrefix)
      ) {
        return `${rule.toUrlPrefix}${url.substring(rule.fromUrlPrefix.length)}`;
      }
    }
  }
  return undefined;
}

function createCorsRequest(originalRequest, url, headers) {
  if (url === originalRequest.url) {
    return new Request(originalRequest, {
      mode: "cors", // Required for adding custom HTTP headers.
      headers
    });
  }

  const method = originalRequest.method.toUpperCase();
  const requestInit = {
    cache: originalRequest.cache,
    credentials: originalRequest.credentials,
    headers,
    integrity: originalRequest.integrity,
    keepalive: originalRequest.keepalive,
    method: originalRequest.method,
    mode: "cors",
    redirect: originalRequest.redirect,
    referrer: originalRequest.referrer,
    referrerPolicy: originalRequest.referrerPolicy
  };
  if (method !== "GET" && method !== "HEAD") {
    requestInit.body = originalRequest.body;
  }
  return new Request(url, requestInit);
}

function getSourceUrl(clientId) {
  if (typeof clientId !== "string" || clientId.length === 0) {
    return Promise.resolve(undefined);
  }
  const cached = sourceUrlsByClientId.get(clientId);
  if (cached !== undefined) {
    return cached;
  }
  const lookup = withTimeout(self.clients.get(clientId))
    .then(client =>
      client !== undefined &&
      client !== null &&
      client.type === "window" &&
      typeof client.url === "string" &&
      client.url.length > 0
        ? client.url
        : undefined
    )
    .catch(() => undefined);
  sourceUrlsByClientId.set(clientId, lookup);
  if (sourceUrlsByClientId.size > maxSourceUrlCacheEntries) {
    sourceUrlsByClientId.delete(sourceUrlsByClientId.keys().next().value);
  }
  return lookup;
}

function withTimeout(promise) {
  return Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(undefined), 250))]);
}

async function getState() {
  if (transientCache !== undefined && transientUrlRewriteRules !== undefined) {
    return { config: transientCache, urlRewriteRules: transientUrlRewriteRules };
  }

  const cache = await getCache();
  const responses = await Promise.all([
    cache.match(persistentCacheKey),
    cache.match(persistentUrlRewriteRulesCacheKey)
  ]);
  const config = responses[0] === undefined ? [] : await responses[0].json();
  const urlRewriteRules = responses[1] === undefined ? [] : await responses[1].json();

  transientCache = Array.isArray(config) ? config : [];
  transientUrlRewriteRules = Array.isArray(urlRewriteRules) ? urlRewriteRules : [];
  return { config: transientCache, urlRewriteRules: transientUrlRewriteRules };
}

async function setConfig(config, urlRewriteRules) {
  // Ensures "fetch" events can start seeing the config immediately. Persistent config is only required for when this
  // service worker expires (after 30s on some browsers, like FireFox on Windows).
  transientCache = config;
  transientUrlRewriteRules = Array.isArray(urlRewriteRules) ? urlRewriteRules : [];

  const cache = await getCache();
  await Promise.all([
    cache.put(persistentCacheKey, new Response(JSON.stringify(config))),
    cache.put(persistentUrlRewriteRulesCacheKey, new Response(JSON.stringify(transientUrlRewriteRules)))
  ]);
}

function getCache() {
  return caches.open(persistentCacheName);
}
