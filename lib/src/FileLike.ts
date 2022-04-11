export interface FileLike {
  readonly name: string;
  readonly size: number;
  readonly type: string;

  // eslint-disable-next-line @typescript-eslint/member-ordering
  slice: (start?: number, end?: number) => Blob;
}
export namespace FileLike {
  export function is(value: object): value is FileLike {
    return (value as Partial<FileLike>).slice !== undefined;
  }
}
