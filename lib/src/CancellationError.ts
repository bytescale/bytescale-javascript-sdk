export class CancellationError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CancellationError.prototype);
  }
}
