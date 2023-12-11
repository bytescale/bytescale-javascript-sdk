import { BeginAuthSessionParams } from "./AuthManagerInterface";
import { ServiceWorkerConfig } from "./ServiceWorkerConfig";

export interface AuthSession {
  accessToken: string | undefined;
  accessTokenRefreshHandle: number | undefined;
  authServiceWorker: ServiceWorkerConfig | undefined;
  isActive: boolean;
  params: BeginAuthSessionParams;
}
