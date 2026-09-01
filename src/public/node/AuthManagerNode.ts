import { AuthManagerInterface } from "../../private/model/AuthManagerInterface";
import { EnvChecker } from "../../private/EnvChecker";
import { BeginAuthSessionParams } from "../../private/model/BeginAuthSessionParams";

export type { AuthSwConfigEntryDto } from "../../private/dtos/AuthSwConfigEntryDto";
export type { AuthSwHeaderDto } from "../../private/dtos/AuthSwHeaderDto";

class AuthManagerImpl implements AuthManagerInterface {
  async beginAuthSession(_params: BeginAuthSessionParams): Promise<void> {
    throw EnvChecker.methodRequiresBrowser("beginAuthSession");
  }

  async endAuthSession(): Promise<void> {
    throw EnvChecker.methodRequiresBrowser("endAuthSession");
  }

  isAuthSessionActive(): boolean {
    return false;
  }

  isAuthSessionReady(): boolean {
    return false;
  }
}

/**
 * Alternative way of implementing a static class (i.e. all methods static). We do this so we can use a interface on the class (interfaces can't define static methods).
 */
export const AuthManager = new AuthManagerImpl();
export { BeginAuthSessionParamsV1 } from "../../private/model/BeginAuthSessionParamsV1";
export { BeginAuthSessionParamsV2 } from "../../private/model/BeginAuthSessionParamsV2";
export { BeginAuthSessionParams } from "../../private/model/BeginAuthSessionParams";
export { AuthSessionConfigAuto } from "../../private/model/AuthSessionConfigAuto";
export { AuthSessionConfigManual } from "../../private/model/AuthSessionConfigManual";
export { AuthSessionConfig } from "../../private/model/AuthSessionConfig";
export { AuthSessionConfigBase } from "../../private/model/AuthSessionConfigBase";
export { UrlRewriteRule } from "../../private/model/UrlRewriteRule";
export { NonEmptyArray } from "../../private/model/NonEmptyArray";
export { BeginAuthSessionParamsOptions } from "../../private/model/BeginAuthSessionParamsOptions";
