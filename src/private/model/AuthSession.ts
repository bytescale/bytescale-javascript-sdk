import { AuthManagerServiceWorkerConfig, BeginAuthSessionParams } from "./AuthManagerInterface";
import { AuthSwConfigEntryDto } from "../dtos/AuthSwConfigEntryDto";
import { ServiceWorkerConfig } from "./ServiceWorkerConfig";

export interface AuthSession {
  accessToken: string | undefined;
  accessTokenRefreshHandle: number | undefined;
  authServiceWorker: ServiceWorkerConfig | undefined;
  isActive: boolean;
  isReady?: boolean; // Optional because AuthSessionState is shared with older SDK versions.
  params: BeginAuthSessionParams;
  primaryAuthSwConfig: AuthSwConfigEntryDto | undefined;
  serviceWorkerConfig: AuthManagerServiceWorkerConfig | undefined;
  serviceWorkerConfigRefreshHandle: number | undefined;
}
