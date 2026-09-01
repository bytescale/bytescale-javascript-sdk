import { AuthSwConfigDto } from "./AuthSwConfigDto";

import { UrlRewriteRule } from "../model/UrlRewriteRule";

export interface AuthSwSetConfigDto {
  config: AuthSwConfigDto;

  /**
   * We use a specific name for this type, since you can only register one service worker per scope, meaning it's
   * possible the user will want to use their own service worker, which means we'll need to support having the Bytescale
   * Auth Service Worker being a component of the user's service worker. Thus, we use a specific name to avoid conflict
   * with the user's events.
   */
  type: "SET_BYTESCALE_AUTH_CONFIG";

  urlRewriteRules?: UrlRewriteRule[];
}
