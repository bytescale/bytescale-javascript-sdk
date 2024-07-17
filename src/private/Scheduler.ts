import { ConsoleUtils } from "./ConsoleUtils";

/**
 * -------------------------
 * Q: Why not use 'setTimeout'?
 * -------------------------
 * A: setTimeout can be paused (e.g., during hibernation), risking JWT expiration before it triggers.
 *    We therefore use a scheduler to check wall-clock time every second and execute the callback at the scheduled time.
 * -------------------------
 */
export class Scheduler {
  private callbacks: { [handle: number]: { callback: () => void; epoch: number } } = {};
  private nextId: number = 0;
  private intervalId: number | undefined = undefined;

  schedule(epoch: number, callback: () => void): number {
    const handle = this.nextId++;
    this.callbacks[handle] = { epoch, callback };
    this.startInterval();
    return handle;
  }

  unschedule(handle: number): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.callbacks[handle];

    if (Object.keys(this.callbacks).length === 0) {
      this.stopInterval();
    }
  }

  private startInterval(): void {
    if (this.intervalId === undefined) {
      this.intervalId = setInterval(() => this.checkCallbacks(), 1000) as any;
    }
  }

  private stopInterval(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private checkCallbacks(): void {
    const now = Date.now();

    for (const handleStr in this.callbacks) {
      const handle = parseInt(handleStr);

      if (this.callbacks[handle].epoch <= now) {
        try {
          this.callbacks[handle].callback();
        } catch (e: any) {
          ConsoleUtils.error(`Unhandled error from scheduled callback: ${e as string}`);
        }

        this.unschedule(handle);
      }
    }
  }
}
