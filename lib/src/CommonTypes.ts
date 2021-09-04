export interface CancellablePromise<T> {
  cancel: () => void;
  promise: Promise<T>;
}
