import { Transform, TransformCallback, TransformOptions } from "stream";

interface ProgressStreamOptions extends TransformOptions {
  /**
   * Optional callback to handle progress updates.
   * @param totalBytesTransferred - The total number of bytes transferred so far.
   */
  onProgress?: (totalBytesTransferred: number) => void;
}

export class ProgressStream extends Transform {
  private readonly onProgress: ((bytesTransferred: number) => void) | undefined;
  private totalBytes: number = 0;

  constructor(options?: ProgressStreamOptions) {
    super(options);
    this.onProgress = options?.onProgress;
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.totalBytes += chunk.length;

    // Invoke the progress callback if provided
    if (this.onProgress !== undefined) {
      this.onProgress(this.totalBytes);
    }

    // Pass the chunk along
    this.push(chunk);
    callback();
  }
}
