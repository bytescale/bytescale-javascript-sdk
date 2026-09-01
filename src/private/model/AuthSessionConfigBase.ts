export interface AuthSessionConfigBase {
  /** The Bytescale account authorized by this configuration. */
  accountId: string;

  /** A string names this configuration. `undefined` deliberately marks it as the session default. */
  authConfigId: string | undefined;

  /** Enables CDN cookie authentication. Defaults to false. */
  enableCookieAuth?: boolean;

  /** Enables CDN service-worker authentication. Defaults to true. */
  enableServiceWorkerAuth?: boolean;

  /** Restricts service-worker authentication to matching page or iframe URLs. */
  sourceUrlPrefixes?: string[];
}
