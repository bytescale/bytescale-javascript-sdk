export interface AuthSession {
  accessToken: string | undefined;
  accessTokenRefreshHandle: number | undefined;
  authUrl: string;
  isActive: boolean;
}
