export interface AuthSessionConfigBase {
  /** The Bytescale account authorized by this configuration. */
  accountId: string;

  /** A string names this configuration. `undefined` deliberately marks it as the session default. */
  authConfigId: string | undefined;

  /** Overrides `options.cdnUrl` for this configuration. Excludes the trailing "/". */
  cdnUrl?: string;

  /** Enables CDN cookie authentication. Defaults to false. */
  enableCookieAuth?: boolean;

  /** Enables CDN service-worker authentication. Defaults to true. */
  enableServiceWorkerAuth?: boolean;

  /**
   * Restricts service-worker authentication to original resource URLs, before URL rewriting.
   * Uses case-sensitive startsWith matching against any prefix. Undefined allows all requests; [] allows none.
   * The final destination must still match this configuration's CDN and account.
   * Does not affect API-client or cookie authentication, token acquisition, or refresh.
   * Requires the auth service worker shipped with SDK 3.62.0 or later; older workers skip this config.
   */
  requestUrlPrefixes?: string[];

  /** Restricts service-worker authentication to matching page or iframe URLs. */
  sourceUrlPrefixes?: string[];
}
