import { AuthSession } from "./model/AuthSession";
import { FairMutex } from "./FairMutex";

export interface ResolvedAuthSessionConfig {
  accessToken: string;
  accountId: string;
  jwt: string | undefined;
}

/**
 * Maintains a global session state, even across package versions.
 *
 * This is to allow users to start auth sessions via the Bytescale JavaScript SDK, where due to versioning or other
 * bundling issues, the Bytescale Upload Widget has been bundled with a different Bytescale JavaScript SDK. In this
 * scenario, the user wouldn't be able to start an auth session with the Bytescale Upload Widget. Therefore, we use
 * global state (i.e. on the window) to ensure the session state can be shared between the user's instance of the
 * Bytescale JavaScript SDK and the Upload Widget's version of the Bytescale JavaScript SDK.
 *
 * Users also frequently have problems caused by them not keeping track of *Api and *Manager instances correctly, so
 * making this global prevents a lot of common mistakes.
 */
export class AuthSessionState {
  private static readonly stateKey = "BytescaleSessionState";
  private static readonly mutexKey = "BytescaleSessionStateMutex";

  /**
   * Called in the browser only.
   */
  static getMutex(): FairMutex {
    const key = AuthSessionState.mutexKey;
    let mutex = (window as any)[key] as FairMutex | undefined;

    if (mutex === undefined) {
      mutex = new FairMutex();
      (window as any)[key] = mutex;
    }

    return mutex;
  }

  /**
   * Called in the browser only.
   */
  static setSession(session: AuthSession | undefined): void {
    (window as any)[AuthSessionState.stateKey] = session;
  }

  /**
   * Called in the browser and in Node.js (so we check the env before calling env-specific code).
   */
  static getSession(): AuthSession | undefined {
    if (typeof window === "undefined") {
      return undefined;
    }
    return (window as any)[AuthSessionState.stateKey];
  }

  /** Resolves request-time auth while remaining compatible with the single-token session used by SDK 3.54.0. */
  static resolveAuthConfig(
    authConfigId: string | false | undefined,
    requireReadyDefault: boolean
  ): ResolvedAuthSessionConfig | undefined {
    if (authConfigId === false) {
      return undefined;
    }

    const session = AuthSessionState.getSession();
    if (session === undefined || !session.isActive) {
      if (typeof authConfigId === "string") {
        throw new Error(`No active AuthManager configuration has ID '${authConfigId}'.`);
      }
      return undefined;
    }

    if (Array.isArray(session.authConfigs)) {
      const state = session.authConfigs.find(config => config.config.authConfigId === authConfigId);
      if (state === undefined) {
        if (typeof authConfigId === "string") {
          throw new Error(`No active AuthManager configuration has ID '${authConfigId}'.`);
        }
        return undefined;
      }

      if (
        state.accessToken === undefined ||
        state.expiresAt === undefined ||
        state.expiresAt <= Date.now() ||
        state.jwt === undefined
      ) {
        const isV2Session = typeof (session.params as { authConfigs?: unknown }).authConfigs === "function";
        if (typeof authConfigId === "string" || requireReadyDefault || isV2Session) {
          throw new Error(`AuthManager configuration '${authConfigId ?? "default"}' is not ready.`);
        }
        return undefined;
      }

      return {
        accessToken: state.accessToken,
        accountId: state.config.accountId,
        jwt: state.jwt
      };
    }

    if (typeof authConfigId === "string") {
      throw new Error(`No active AuthManager configuration has ID '${authConfigId}'.`);
    }
    if (session.accessToken === undefined || typeof session.params.accountId !== "string") {
      return undefined;
    }
    return {
      accessToken: session.accessToken,
      accountId: session.params.accountId,
      jwt: undefined
    };
  }
}
