import { ConsoleUtils } from "./ConsoleUtils";

/**
 * -------------------------
 * Q: Why not use 'setTimeout'?
 * -------------------------
 * A: setTimeout can be paused (e.g., during hibernation), risking JWT expiration before it triggers.
 *    We therefore check wall-clock time every second and on browser resume events. A backwards clock adjustment runs
 *    scheduled callbacks immediately so authentication can be safely re-established against the server-provided TTL.
 * -------------------------
 */
export class Scheduler {
  private readonly clockRollbackToleranceMilliseconds = 1000;
  private callbacks: { [handle: number]: { callback: () => void; epoch: number } } = {};
  private documentEventTarget: Document | undefined;
  private nextId: number = 0;
  private intervalId: number | undefined = undefined;
  private lastObservedEpoch: number | undefined;
  private windowEventTarget: Window | undefined;

  schedule(epoch: number, callback: () => void): number {
    const handle = this.nextId++;
    this.callbacks[handle] = { epoch, callback };
    this.startMonitoring();
    return handle;
  }

  unschedule(handle: number): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.callbacks[handle];

    if (Object.keys(this.callbacks).length === 0) {
      this.stopMonitoring();
    }
  }

  private readonly checkAfterResume = (): void => this.checkCallbacks();
  private readonly checkAfterVisibilityChange = (): void => {
    if (this.documentEventTarget?.visibilityState === "visible") {
      this.checkCallbacks();
    }
  };

  private startMonitoring(): void {
    if (this.intervalId === undefined) {
      this.lastObservedEpoch = Date.now();
      this.intervalId = setInterval(() => this.checkCallbacks(), 1000) as any;
      this.startListeningForResume();
    }
  }

  private stopMonitoring(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      this.lastObservedEpoch = undefined;
      this.stopListeningForResume();
    }
  }

  private checkCallbacks(): void {
    const now = Date.now();
    const clockMovedBackwards =
      this.lastObservedEpoch !== undefined && now < this.lastObservedEpoch - this.clockRollbackToleranceMilliseconds;
    this.lastObservedEpoch = now;

    for (const handleStr in this.callbacks) {
      const handle = parseInt(handleStr);

      if (clockMovedBackwards || this.callbacks[handle].epoch <= now) {
        try {
          this.callbacks[handle].callback();
        } catch (e: any) {
          ConsoleUtils.error(`Unhandled error from scheduled callback: ${e as string}`);
        }

        this.unschedule(handle);
      }
    }
  }

  private startListeningForResume(): void {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      this.windowEventTarget = window;
      for (const eventName of ["focus", "online", "pageshow"]) {
        this.windowEventTarget.addEventListener(eventName, this.checkAfterResume);
      }
    }

    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      this.documentEventTarget = document;
      this.documentEventTarget.addEventListener("resume", this.checkAfterResume);
      this.documentEventTarget.addEventListener("visibilitychange", this.checkAfterVisibilityChange);
    }
  }

  private stopListeningForResume(): void {
    if (this.windowEventTarget !== undefined) {
      for (const eventName of ["focus", "online", "pageshow"]) {
        this.windowEventTarget.removeEventListener(eventName, this.checkAfterResume);
      }
      this.windowEventTarget = undefined;
    }

    if (this.documentEventTarget !== undefined) {
      this.documentEventTarget.removeEventListener("resume", this.checkAfterResume);
      this.documentEventTarget.removeEventListener("visibilitychange", this.checkAfterVisibilityChange);
      this.documentEventTarget = undefined;
    }
  }
}
