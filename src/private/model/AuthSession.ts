import { AuthSessionConfig, BeginAuthSessionParams } from "./AuthManagerInterface";
import { ServiceWorkerConfig } from "./ServiceWorkerConfig";

export interface AuthSessionConfigState {
  accessToken: string | undefined;
  config: AuthSessionConfig;
  expiresAt: number | undefined;
  jwt: string | undefined;
  refreshHandle: number | undefined;
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
