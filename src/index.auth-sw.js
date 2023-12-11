/**
 * Bytescale Auth Service Worker (SW)
 *
 * What is this?
 * ------------
 * This script is designed to be imported into a 'service worker' that's included in a top-level script on the user's
 * web application's domain. This script intercepts FETCH requests to add JWTs (issued by the user's application) to
 * Bytescale CDN requests via the 'Authorization-Token' request header. This allows the Bytescale CDN to authorize
 * requests using 'Authorization-Token' headers as opposed to cookies, which are blocked by some browsers (including Safari).
 *
 * Installation
 * ------------
 * 1. The user must add a root-level script to their application, under their web application's domain, that includes:
 *    importScripts("https://js.bytescale.com/auth-sw/v1");
 * 2. This script MUST be hosted on the _exact domain_ your website is running on; you cannot host it from a different (sub)domain.
 *    Explanation: service workers cannot be added cross-domain. This is a restriction of the service worker API.
 * 3. This script MUST be hosted in the root folder (e.g. '/bytescale-auth-sw.js' and not '/scripts/bytescale-auth-sw.js')
 *    Explanation: service workers can only intercept HTTP requests from pages that are at the same level as, or lower than, the script's path.
 * 4. Add the 'serviceWorkerScript' field to the 'beginAuthSession' method call in your code, specifying the path to this script.
 */

// See: AuthSwConfigDto
let config; // [{urlPrefix, headers, expires?}]
let resolveInitialConfig; // Thunk created during the "install" event and called during the first "message" event.

console.log(`[bytescale] Auth SW Registered.`);

/* eslint-disable no-undef */
self.addEventListener("install", function (event) {
  event.waitUntil(install());
});

self.addEventListener("activate", function (event) {
  // Immediately allow the service worker to intercept "fetch" events (instead of requiring a page refresh) if this is the first time this service worker is being installed.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", event => {
  // Allows communication with the windows/tabs that have are able to generate the JWT (as they have the auth session with the user's API).
  // See: AuthSwSetConfigDto
  if (event.data) {
    switch (event.data.type) {
      case "SET_BYTESCALE_AUTH_CONFIG":
        // Auth sessions are started/ended by calling SET_CONFIG with auth config or with 'undefined' config, respectively.
        // We use 'undefined' to end the auth session instead of unregistering the worker, as there may be multiple tabs
        // in the user's application, so while the user may sign out in one tab, they may remain signed in to another tab,
        // which may subsequently send a follow-up 'SET_CONFIG' which will resume auth.
        config = event.data.config;

        if (resolveInitialConfig !== undefined) {
          resolveInitialConfig();
          resolveInitialConfig = undefined;
        }
        break;
    }
  }
});

self.addEventListener("fetch", function (event) {
  const url = event.request.url;

  if (config !== undefined) {
    // Config is an array to support multiple different accounts within a single website, if needed.
    for (const { expires, urlPrefix, headers } of config) {
      if (expires === undefined || expires > Date.now()) {
        if (url.startsWith(urlPrefix) && event.request.method.toUpperCase() === "GET") {
          const newHeaders = new Headers(event.request.headers);
          for (const { key, value } of headers) {
            newHeaders.append(key, value);
          }
          const newRequest = new Request(event.request, {
            mode: "cors", // Required for adding custom HTTP headers.
            headers: newHeaders
          });
          event.respondWith(fetch(newRequest));

          // Do not match on any other configs
          return;
        }
      }
    }
  }
});

async function install() {
  // Wait for the initial config to be received before activating this service worker.
  // This prevents us from replacing a functional service worker (with config) with a service worker that initially
  // has no config, and thus causes private file downloads to fail as they're temporarily not being authorized due to
  // the new service worker being active but not having its config yet.
  await new Promise(resolve => {
    resolveInitialConfig = resolve;
  });

  // Typically service workers go: 'installing' -> 'waiting' -> 'activated'.
  // However, we skip the 'waiting' phase as we want this service worker to be used immediately after it's installed,
  // instead of requiring a page refresh if the browser already has an old version of the service worker installed.
  await self.skipWaiting();
}
