import { BeginAuthSessionParamsOptions } from "./BeginAuthSessionParamsOptions";

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
