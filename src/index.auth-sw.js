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
const persistentCacheName = "bytescale-sw-config";
const persistentCacheKey = "config";

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
        setConfig(event.data.config).then(
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
    const newRequest = interceptRequest(event, config);
    if (newRequest !== undefined) {
      event.respondWith(handleRequestErrors(newRequest));
    }
  };

  // Slower and intercepts all requests (while still only rewriting the relevant requests).
  // Called only for the initial request after this Service Worker is restarted after going idle (e.g. after 30s on Firefox/Windows).
  const interceptAsync = async () =>
    await handleRequestErrors(interceptRequest(event, await getConfig()) ?? event.request);

  // Makes it clearer to developers that the request failed for normal reasons (not reasons caused by this script).
  const handleRequestErrors = async request => {
    try {
      return await fetch(request);
    } catch (e) {
      throw new Error("Network request failed: see previous browser errors for the cause.");
    }
  };

  // Optimization: avoids running async code (which necessitates intercepting all requests) when the config is already cached locally.
  if (transientCache !== undefined) {
    interceptSync(transientCache);
  } else {
    event.respondWith(interceptAsync());
  }
});

function interceptRequest(event, config) {
  const url = event.request.url;

  if (config !== undefined) {
    // Config is an array to support multiple different accounts within a single website, if needed.
    for (const { expires, urlPrefix, headers } of config) {
      if (expires === undefined || expires > Date.now()) {
        if (url.startsWith(urlPrefix) && event.request.method.toUpperCase() === "GET") {
          const newHeaders = new Headers(event.request.headers);
          for (const { key, value } of headers) {
            // Preserve existing headers in the request. This is crucial for 'fetch' requests that might already
            // include an "Authorization" header, enabling access to certain resources. For instance, the Bytescale
            // Dashboard uses an explicit "Authorization" header in a 'fetch' request to allow account admins to
            // download private files. In these scenarios, it's important not to replace these headers with the global
            // JWT managed by the AuthManager.
            if (!newHeaders.has(key)) {
              newHeaders.set(key, value);
            }
          }

          return new Request(event.request, {
            mode: "cors", // Required for adding custom HTTP headers.
            headers: newHeaders
          });
        }
      }
    }
  }

  return undefined;
}

async function getConfig() {
  if (transientCache !== undefined) {
    return transientCache;
  }

  const cache = await getCache();
  const configResponse = await cache.match(persistentCacheKey);
  if (configResponse !== undefined) {
    const config = await configResponse.json();
    transientCache = config;
    return config;
  }

  return undefined;
}

async function setConfig(config) {
  // Ensures "fetch" events can start seeing the config immediately. Persistent config is only required for when this
  // service worker expires (after 30s on some browsers, like FireFox on Windows).
  transientCache = config;

  const cache = await getCache();
  await cache.put(persistentCacheKey, new Response(JSON.stringify(config)));
}

function getCache() {
  return caches.open(persistentCacheName);
}
