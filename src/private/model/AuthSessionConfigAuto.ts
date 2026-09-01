import { AuthSessionConfigBase } from "./AuthSessionConfigBase";

export interface AuthSessionConfigAuto extends AuthSessionConfigBase {
  authHeaders: () => Promise<Record<string, string>>;
  authUrl: string;
  getAuthorizationToken?: never;
}
