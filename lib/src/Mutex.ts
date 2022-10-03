import { MutexInterface } from "upload-js/MutexInterface";

/**
 * A lightweight mutex. (Other libraries contain too many features and we want to keep the size upload-js down).
 *
 * Characteristics:
 * - Non-reentrant.
 * - Unfair. (Multiple callers awaiting 'acquire' will be granted the mutex in no order.)
 *   - When calling `safe` consecutively with no 'awaits' in-between, the current context will synchronously acquire
 *     the mutex every time.
 */
export function Mutex(): MutexInterface {
  let mutex: Promise<void> | undefined;
  let resolver: (() => void) | undefined;

  const safe = async <T>(callback: () => Promise<T>): Promise<T> => {
    await acquire();
    try {
      return await callback();
    } finally {
      release();
    }
  };

  const acquire = async (): Promise<void> => {
    // Loop necessary for when multiple calls are made to 'acquire' before a 'release' is called, else the call to
    // 'release' will resume every caller currently waiting on 'acquire'.
    // eslint-disable-next-line no-unmodified-loop-condition
    while (mutex !== undefined) {
      await mutex;
    }

    mutex = new Promise(resolve => {
      resolver = resolve;
    });
  };

  const release = (): void => {
    if (resolver === undefined) {
      throw new Error("Unable to release mutex: already released.");
    }

    resolver();
    resolver = undefined;
    mutex = undefined;
  };

  return {
    safe
  };
}
