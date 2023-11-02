/**
 * A lightweight fair mutex. (Other libraries contain too many features and we want to keep size down).
 *
 * Characteristics:
 * - Non-reentrant.
 * - Fair.
 *   - This means multiple callers awaiting 'lock' will be granted the mutex in the order they requested it.
 *   - This is important, as in React, developers calling 'AuthManager.endAuthSession' in a 'useEffect' cleanup need it
 *     to take effect immediately, such that subsequent 'AuthManager.beginAuthSession' calls will always succeed.
 *   - When calling `safe` consecutively with no 'awaits' in-between, the current context will synchronously acquire
 *     the mutex every time.
 */
export class FairMutex {
  private locked = false;
  private readonly queue: Array<{ resolve: () => void }> = [];

  async safe<T>(callback: () => Promise<T>): Promise<T> {
    await this.lock();
    try {
      return await callback();
    } finally {
      this.unlock();
    }
  }

  private async lock(): Promise<void> {
    if (this.locked) {
      let unlockNext: (() => void) | undefined;
      const lockPromise = new Promise<void>(resolve => {
        unlockNext = resolve;
      });
      if (unlockNext === undefined) {
        throw new Error("unlockNext was undefined");
      }
      this.queue.push({ resolve: unlockNext });
      await lockPromise;
    }
    this.locked = true;
  }

  private unlock(): void {
    if (!this.locked) {
      throw new Error("Mutex is not locked.");
    }
    const nextInQueue = this.queue.shift();
    if (nextInQueue !== undefined) {
      nextInQueue.resolve();
    } else {
      this.locked = false;
    }
  }
}
