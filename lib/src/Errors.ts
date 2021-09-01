export class Cancellation extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, Cancellation.prototype);
  }
}

export function isCancellationError(error: any): boolean {
  return error instanceof Cancellation;
}
