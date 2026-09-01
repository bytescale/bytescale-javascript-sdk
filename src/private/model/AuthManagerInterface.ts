import { BytescaleApiClientConfig } from "../../public/shared";

export type BeginAuthSessionParamsOptions = Pick<BytescaleApiClientConfig, "fetchApi" | "cdnUrl">;

export type NonEmptyArray<T> = readonly [T, ...T[]];

export interface UrlRewriteRule {
  /** URL prefix to replace. This URL must be covered by the service worker's origin and scope. */
  fromUrlPrefix: string;

  /** Replacement URL prefix. The remainder of the original URL is appended unchanged. */
  toUrlPrefix: string;
}

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

export interface AuthSessionConfigAuto extends AuthSessionConfigBase {
  authHeaders: () => Promise<Record<string, string>>;
  authUrl: string;
  getAuthorizationToken?: never;
}

export interface AuthSessionConfigManual extends AuthSessionConfigBase {
  authHeaders?: never;
  authUrl?: never;

  /** Returns the JWT for this configuration. AuthManager refreshes it based on its validated TTL. */
  getAuthorizationToken: () => Promise<string>;
}

export type AuthSessionConfig = AuthSessionConfigAuto | AuthSessionConfigManual;

/** The complete AuthManager input supported by SDK 3.54.0. */
export interface BeginAuthSessionParamsV1 {
  accountId: string;
  authConfigs?: never;
  authHeaders: () => Promise<Record<string, string>>;
  authUrl: string;
  options?: BeginAuthSessionParamsOptions;
  serviceWorkerScript?: string;
  urlRewriteRules?: never;
}

export interface BeginAuthSessionParamsV2 {
  /** Present only to make the structural distinction from V1 explicit. */
  accountId?: undefined;
  authConfigs: () => Promise<NonEmptyArray<AuthSessionConfig>>;
  authHeaders?: never;
  authUrl?: never;
  options?: BeginAuthSessionParamsOptions;

  /** Required when a configuration enables service-worker authentication or a rewrite rule is present. */
  serviceWorkerScript?: string;

  /** Rewrites in-scope requests before service-worker authentication matching. */
  urlRewriteRules?: UrlRewriteRule[];
}

export type BeginAuthSessionParams = BeginAuthSessionParamsV1 | BeginAuthSessionParamsV2;

export interface AuthManagerInterface {
  /** Begins a browser JWT session. All configurations are initialized before the session reports ready. */
  beginAuthSession: (params: BeginAuthSessionParams) => Promise<void>;

  /** Ends the active session and clears its API, cookie, and service-worker authentication state. */
  endAuthSession: () => Promise<void>;

  /** Checks whether an authentication session is active. */
  isAuthSessionActive: () => boolean;

  /** Checks whether every configuration in the active session is ready. */
  isAuthSessionReady: () => boolean;
}
