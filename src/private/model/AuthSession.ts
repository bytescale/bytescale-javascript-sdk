import { BeginAuthSessionParams } from "./AuthManagerInterface";
import { ServiceWorkerConfig } from "./ServiceWorkerConfig";

export interface AuthSession {
  accessToken: string | undefined;
  accessTokenRefreshHandle: number | undefined;
  authServiceWorker: ServiceWorkerConfig | undefined;
  isActive: boolean;
  isReady?: boolean; // Optional because AuthSessionState is shared with older SDK versions.
  params: BeginAuthSessionParams;
}
