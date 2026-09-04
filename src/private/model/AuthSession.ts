import { ServiceWorkerConfig } from "./ServiceWorkerConfig";
import { BeginAuthSessionParams } from "./BeginAuthSessionParams";
import { AuthSessionConfig } from "./AuthSessionConfig";

export interface AuthSessionConfigState {
  accessToken: string | undefined;
  /** The latest AuthManager-owned authentication operation; settled while idle and pending during refresh. */
  authenticationPromise?: Promise<void>;
  config: AuthSessionConfig;
  expiresAt: number | undefined;
  jwt: string | undefined;
  refreshHandle: number | undefined;
  /** Present only while AuthManager is refreshing, so concurrent manager refresh attempts can be deduplicated. */
  refreshPromise?: Promise<void>;
}

export interface AuthSession {
  /** Legacy default-token fields retained for SDK 3.54.0 bundles sharing this global state. */
  accessToken: string | undefined;
  accessTokenRefreshHandle: number | undefined;

  authConfigs?: AuthSessionConfigState[];
  authServiceWorker: ServiceWorkerConfig | undefined;
  isActive: boolean;
  isReady?: boolean;
  params: BeginAuthSessionParams;
  serviceWorkerConfigured?: boolean;
}
