import { BeginAuthSessionParams } from "./BeginAuthSessionParams";

export interface AuthManagerInterface {
  /**
   * Begins a JWT auth session with the Bytescale API and Bytescale CDN.
   *
   * The primary JWT authenticates Bytescale API operations and downloads for `accountId`. Optional additional
   * service-worker rules authenticate downloads only.
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
