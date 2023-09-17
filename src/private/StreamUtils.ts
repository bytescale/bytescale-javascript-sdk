import { Readable } from "stream";
import type * as stream from "stream";

export class StreamUtils {
  static create(): stream.Readable {
    const readable = new Readable();
    readable._read = () => {}; // _read is required but you can noop it
    return readable;
  }

  static empty(): NodeJS.ReadableStream {
    const readable = StreamUtils.create();
    StreamUtils.endStream(readable);
    return readable;
  }

  static fromArrayBuffer(buffer: ArrayBuffer): NodeJS.ReadableStream {
    return StreamUtils.fromBuffer(Buffer.from(buffer));
  }

  static fromBuffer(buffer: Buffer): NodeJS.ReadableStream {
    const readable = StreamUtils.create();
    readable.push(buffer);
    StreamUtils.endStream(readable);
    return readable;
  }

  static endStream(readable: stream.Readable): void {
    readable.push(null);
  }
}
