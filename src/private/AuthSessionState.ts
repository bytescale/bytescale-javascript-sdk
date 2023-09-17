import { AuthSession } from "./model/AuthSession";
import { Mutex } from "./Mutex";

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
  static getMutex(): Mutex {
    const key = AuthSessionState.mutexKey;
    let mutex = (window as any)[key] as Mutex | undefined;

    if (mutex === undefined) {
      mutex = new Mutex();
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
}
