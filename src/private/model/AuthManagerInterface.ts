import { BytescaleApiClientConfig } from "../../public/shared";

export interface BeginAuthSessionParams {
  /**
   * The account ID to authorize requests for.
   */
  accountId: string;

  /**
   * Headers to send to your backend API.
   *
   * IMPORTANT: do not call 'AuthManager.beginAuthSession' or 'AuthManager.endAuthSession' inside this callback, as this will cause a deadlock.
   */
  authHeaders: () => Promise<Record<string, string>>;

  /**
   * The fully-qualified URL for your backend API's auth endpoint (the endpoint that returns a JWT as plain text).
   */
  authUrl: string;

  /**
   * Optional configuration.
   */
  options?: Pick<BytescaleApiClientConfig, "fetchApi" | "cdnUrl">;

  /**
   * Enables support for modern browsers that block third-party cookies (like Safari).
   *
   * The value of this field must be the path to the service worker JavaScript file hosted at the root of your website.
   *
   * OVERVIEW:
   *
   * This feature works by running a "service worker" in the background that adds "Authorization" and "Authorization-Token"
   * request headers to HTTP requests made to the Bytescale CDN. This allows the Bytescale CDN to authorize requests
   * to private files using JWTs issued by your application. Historically, these requests have been authorized using
   * JWT cookies (i.e. JWTs sent to the Bytescale CDN via the "Cookies" header). However, modern browsers are starting
   * to block these cookies, meaning "Authorization" request headers must be used instead. Authorization headers can
   * only be added to requests originating from page elements like "<img>" elements through the use of service workers.
   *
   * INSTRUCTIONS:
   *
   * 1. Your JWT must include the 'accountId' field at the root of the 'payload' section of the JWT (i.e. next to the 'exp' field).
   *
   * 2. Create a JavaScript file that contains the following line:
   *
   *      importScripts("https://js.bytescale.com/auth-sw/v1");
   *
   * 3. Host this JavaScript file from your website:
   *
   *    3a. It MUST be under the ROOT directory of your website.
   *        (e.g. "/bytescale-auth-sw.js")
   *
   *    3b. It MUST be on the SAME DOMAIN as your website.
   *        (e.g. "www.example.com" and not "assets.example.com")
   *
   * 4. Specify the absolute path to your JavaScript file in the 'beginAuthSession' call.
   *    (e.g. { ..., serviceWorkerScript: "/bytescale-auth-sw.js" })
   *
   * Examples:
   *
   * - CORRECT:   "/bytescale-auth-sw.js"
   * - INCORRECT: "bytescale-auth-sw.js"
   * - INCORRECT: "/scripts/bytescale-auth-sw.js"
   * - INCORRECT: "https://example.com/bytescale-auth-sw.js"
   *
   * Why does the script need to be hosted on the website's domain, under the root directory?:
   *
   * Service workers can only interact with events raised by pages at the same level or below them, hence why your
   * script must be hosted on your website's domain in the root directory.
   */
  serviceWorkerScript?: string;
}

export interface AuthManagerInterface {
  /**
   * Begins a JWT auth session with the Bytescale API and Bytescale CDN.
   *
   * Specifically, calling this method will cause the SDK to periodically acquire a JWT from your JWT endpoint. The SDK will then automatically include this JWT in all subsequent Bytescale API requests (via the 'authorization-token' request header) and also in all Bytescale CDN download requests (via a session cookie, or an 'authorization' header if service workers are being used).
   *
   * You can only call this method if 'isAuthSessionActive() === false', else an error will be returned.
   *
   * You can only call this method in the browser (not Node.js).
   *
   * You should call this method after the user has signed-in to your web app.
   *
   * After calling this method:
   *
   * 1) You must await the returned promise before attempting to perform any downloads or API operations that require authentication.
   *
   * The auth process works as follows:
   *
   * 1) After you call this method, the AuthManager will periodically fetch a JWT in plain text from the given 'authUrl'.
   *
   * 2) The JWT will be added as a request header via 'authorization-token' to all Bytescale API requests made via this SDK. This allows the user to upload private files and perform administrative operations permitted by the JWT, such as deleting files, etc.
   *
   * 3) The JWT will be also saved to a cookie scoped to the Bytescale CDN if service workers are not being used (see the 'serviceWorkerScript' field). This allows the user to view private files via the URL in the browser, including <img> elements on the page that reference private images, etc. If service workers are being used, then the JWT will be submitted to the Bytescale CDN via the 'authorization' header instead.
   */
  beginAuthSession: (params: BeginAuthSessionParams) => Promise<void>;

  /**
   * Ends an authenticated Bytescale API and Bytescale CDN session.
   *
   * This method idempotent, meaning you can call it regardless of the value of 'isAuthSessionActive()', and no error will be thrown.
   *
   * You can only call this method in the browser (not Node.js).
   *
   * You should call this method after the user has signed-out of your web app.
   */
  endAuthSession: () => Promise<void>;

  /**
   * Checks if an authenticated Bytescale API and Bytescale CDN session is active.
   */
  isAuthSessionActive: () => boolean;

  /**
   * Checks if an authenticated Bytescale API and Bytescale CDN session is active and ready to authenticate HTTP requests.
   */
  isAuthSessionReady: () => boolean;
}
