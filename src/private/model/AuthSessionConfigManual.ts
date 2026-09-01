import { AuthSessionConfigBase } from "./AuthSessionConfigBase";

export interface AuthSessionConfigManual extends AuthSessionConfigBase {
  authHeaders?: never;
  authUrl?: never;

  /** Returns the JWT for this configuration. AuthManager refreshes it based on its validated TTL. */
  getAuthorizationToken: () => Promise<string>;
}
