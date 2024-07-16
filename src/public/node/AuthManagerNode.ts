import { AuthManagerInterface, BeginAuthSessionParams } from "../../private/model/AuthManagerInterface";
import { EnvChecker } from "../../private/EnvChecker";

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
