export function assertUnreachable(x: never): never {
  throw new Error(`Didn't expect to get here: ${JSON.stringify(x as any)}`);
}

export function isDefinedEntry<T, K extends string>(object: [K, T | undefined | null]): object is [K, T] {
  return object[1] !== undefined && object[1] !== null;
}
