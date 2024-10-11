import { Readable } from "stream";
import type * as stream from "stream";

export class StreamUtils {
  static create(): stream.Readable {
    return new Readable({
      read(_size) {
        // No implementation needed here.
        // The stream will wait for data to be pushed externally.
      }
    });
  }

  static endStream(readable: stream.Readable): void {
    readable.push(null);
  }

  static empty(): NodeJS.ReadableStream {
    return Readable.from([]);
  }

  static fromBuffer(buffer: Buffer): NodeJS.ReadableStream {
    return Readable.from(buffer);
  }

  static fromArrayBuffer(buffer: ArrayBuffer): NodeJS.ReadableStream {
    return StreamUtils.fromBuffer(Buffer.from(buffer));
  }
}
