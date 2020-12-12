export interface CancellablePromise<T> {
  promise: Promise<T>;
  cancel: () => void;
}
