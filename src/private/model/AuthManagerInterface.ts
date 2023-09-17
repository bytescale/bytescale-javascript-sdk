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
   * The fully-qualified URL for your backend API's auth endpoint.
   */
  authUrl: string;

  /**
   * Optional configuration.
   */
  options?: Pick<BytescaleApiClientConfig, "fetchApi" | "cdnUrl">;
}

export interface AuthManagerInterface {
  /**
   * Begins an authenticated Bytescale API and Bytescale CDN session.
   *
   * You can only call this method if 'isAuthSessionActive() === false', else an error will be returned.
   *
   * You can only call this method in the browser (not Node.js).
   *
   * You should call this method after the user has signed-in to your web app.
   *
   * After calling this method:
   *
   * 1) You must add '?auth=true' to the URL of any private file you're trying to access. This includes the URLs you use in 'src' elements in img/video elements, etc.
   *
   * 2) You must await the promise before attempting to perform any downloads or API operations that require authentication.
   *
   * The auth process works as follows:
   *
   * 1) After you call this method, the AuthManager will periodically fetch a JWT in plain text from the given 'authUrl'.
   *
   * 2) The JWT will be saved to a cookie scoped to the Bytescale CDN. This allows the user to view private files via the URL in the browser, including <img> elements on the page that reference private images, etc.
   *
   * 3) The JWT will also be added as a request header via 'authorization-token' to all Bytescale API requests made via this SDK. This allows the user to upload private files and perform administrative operations permitted by the JWT, such as deleting files, etc.
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
}
