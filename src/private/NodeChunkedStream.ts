import type * as stream from "stream";
import { StreamUtils } from "./StreamUtils";

interface Consumer {
  bytesRemaining: number;
  stream: stream.Readable;
}

/**
 * For Node.js streams only:
 *
 * Converts a stream into a stream of streams, where the next stream is requested via '.take(sizeInBytes: number): Stream'
 *
 * This allows the source stream to be sequentially read (in serial) as a sequence of sub-streams, for the purpose of
 * issuing PutObject requests for a multipart upload, whereby each request requires its own stream, but where that stream
 * needs to be a slice of the source stream.
 */
export class NodeChunkedStream {
  private buffer: Buffer = Buffer.alloc(0);
  private consumer: Consumer | undefined;
  private isSourceFullyConsumed = false; // true if the source stream indicates it has finished.
  private isFinishedConsuming = false; // true if _we_ indicate we have finished reading all we want from the stream.
  private resolver: (() => void) | undefined = undefined;

  constructor(private readonly source: NodeJS.ReadableStream) {}

  /**
   * If the source stream is larger than the 'size' the user is consuming (i.e. they're only wanting to upload a subset
   * of the stream) then the stream won't be resolved by the 'end' event inside 'runChunkPipeline', so calling this
   * method is necessary.
   */
  finishedConsuming(): void {
    this.isFinishedConsuming = true;
    if (this.resolver !== undefined) {
      this.resolver();
    }
  }

  /**
   * Promise resolves when the entire stream has finished processing, or an error occurs.
   * You must call 'take' a sufficient number of times after calling this method in order for this promise to resolve.
   */
  async runChunkPipeline(): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.resolver = resolve;

      const onError = (error: any): void => {
        removeListeners();
        reject(error);
      };
      const onEnd = (): void => {
        this.isSourceFullyConsumed = true;
        removeListeners();
        resolve();
      };
      const onData = (buffer: Buffer): void => {
        try {
          if (this.isFinishedConsuming) {
            return;
          }

          if (this.consumer === undefined) {
            console.warn(
              "Stream yielded data while paused. The data will be buffered, but excessive buffering can cause memory issues."
            );
            this.buffer = Buffer.concat([this.buffer, buffer]);
            return;
          }
          if (this.consumer.bytesRemaining <= 0) {
            throw new Error("Consumer requires zero bytes, so should not be consuming from the stream.");
          }
          if (this.buffer.byteLength > 0) {
            throw new Error(
              "Buffer was expected to be empty (as it should have been flushed to the consumer when '.take' was called)."
            );
          }

          const splitResult = this.splitBuffer(buffer, this.consumer.bytesRemaining);
          if (splitResult === undefined) {
            return; // Received empty data.
          }

          const [consumed, remaining] = splitResult;
          this.buffer = remaining;
          this.consumer.bytesRemaining -= consumed.byteLength;
          this.consumer.stream.push(consumed);
          if (this.consumer.bytesRemaining === 0) {
            StreamUtils.endStream(this.consumer.stream);
            this.consumer = undefined;
            this.source.pause();
          }
        } catch (e) {
          removeListeners();
          reject(e);
        }
      };

      const removeListeners = (): void => {
        this.source.removeListener("data", onData);
        this.source.removeListener("error", onError);
        this.source.removeListener("end", onEnd);
      };

      this.source.on("data", onData);
      this.source.on("error", onError);
      this.source.on("end", onEnd);

      this.source.pause(); // Resumed when 'take' is called.
    });
  }

  /**
   * Only call 'take' after the previously returned stream has been fully consumed.
   */
  take(bytes: number): NodeJS.ReadableStream {
    if (this.consumer !== undefined) {
      throw new Error("The stream from the previous 'take' call must be fully consumed before calling 'take' again.");
    }

    if (bytes <= 0) {
      return StreamUtils.empty();
    }

    const readable = StreamUtils.create();
    const consumedFromBuffer = this.consumeFromBuffer(bytes);
    const consumedFromBufferLength = consumedFromBuffer?.length ?? 0;
    const bytesToConsumeFromStream = bytes - consumedFromBufferLength;

    if (consumedFromBuffer !== undefined) {
      readable.push(consumedFromBuffer);
    }

    if (bytesToConsumeFromStream > 0) {
      if (this.isSourceFullyConsumed) {
        throw new Error(
          `Stream finished processing earlier than expected. The "size" parameter is likely larger than the stream's actual contents.`
        );
      }

      this.consumer = {
        bytesRemaining: bytesToConsumeFromStream,
        stream: readable
      };
      this.source.resume();
    } else {
      StreamUtils.endStream(readable);
    }

    return readable;
  }

  private consumeFromBuffer(bytes: number): Buffer | undefined {
    const splitResult = this.splitBuffer(this.buffer, bytes);
    if (splitResult === undefined) {
      return undefined;
    }

    const [consumed, remaining] = splitResult;
    this.buffer = remaining;
    return consumed;
  }

  private splitBuffer(buffer: Buffer, maxBytes: number): [Buffer, Buffer] | undefined {
    if (buffer.byteLength === 0) {
      return undefined;
    }

    const bytesToConsume = Math.min(maxBytes, buffer.byteLength);
    if (bytesToConsume === buffer.byteLength) {
      return [buffer, Buffer.alloc(0)]; // Optimization
    }

    const consumed = buffer.subarray(0, bytesToConsume);
    const remaining = buffer.subarray(bytesToConsume);
    return [consumed, remaining];
  }
}
