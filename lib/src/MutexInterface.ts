export interface MutexInterface {
  safe: <T>(callback: () => Promise<T>) => Promise<T>;
}
