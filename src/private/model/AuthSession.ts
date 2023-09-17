import { BeginAuthSessionParams } from "./AuthManagerInterface";

export interface AuthSession {
  accessToken: string | undefined;
  accessTokenRefreshHandle: number | undefined;
  isActive: boolean;
  params: BeginAuthSessionParams;
}
