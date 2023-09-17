/**
 * A lightweight mutex. (Other libraries contain too many features and we want to keep size down).
 *
 * Characteristics:
 * - Non-reentrant.
 * - Unfair. (Multiple callers awaiting 'acquire' will be granted the mutex in no order.)
 *   - When calling `safe` consecutively with no 'awaits' in-between, the current context will synchronously acquire
 *     the mutex every time.
 */
export class Mutex {
  private mutex: Promise<void> | undefined = undefined;
  private resolver: (() => void) | undefined = undefined;

  async safe<T>(callback: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await callback();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    // Loop necessary for when multiple calls are made to 'acquire' before a 'release' is called, else the call to
    // 'release' will resume every caller currently waiting on 'acquire'.
    while (this.mutex !== undefined) {
      await this.mutex;
    }

    this.mutex = new Promise(resolve => {
      this.resolver = resolve;
    });
  }

  private release(): void {
    if (this.resolver === undefined) {
      throw new Error("Unable to release mutex: already released.");
    }

    this.resolver();
    this.resolver = undefined;
    this.mutex = undefined;
  }
}
