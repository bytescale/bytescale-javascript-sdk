import { AuthSessionConfig } from "./AuthSessionConfig";
import { UrlRewriteRule } from "./UrlRewriteRule";
import { NonEmptyArray } from "./NonEmptyArray";
import { BeginAuthSessionParamsOptions } from "./BeginAuthSessionParamsOptions";

export interface BeginAuthSessionParamsV2 {
  /** Present only to make the structural distinction from V1 explicit. */
  accountId?: undefined;
  authConfigs: () => Promise<NonEmptyArray<AuthSessionConfig>>;
  authHeaders?: never;
  authUrl?: never;
  options?: BeginAuthSessionParamsOptions;

  /** Required when a configuration enables service-worker authentication or a rewrite rule is present. */
  serviceWorkerScript?: string;

  /** Rewrites in-scope requests before service-worker authentication matching. */
  urlRewriteRules?: UrlRewriteRule[];
}
