import { BeginMultipartUploadRequest } from "./generated";

/**
 * Workaround for tsc aliases, where we cannot export implementation-less modules in our dists.
 */
export const CommonTypesNoOp = false;

export interface BlobLike {
  readonly name?: string;
  readonly size: number;
  readonly type?: string;
  // eslint-disable-next-line @typescript-eslint/member-ordering
  slice: (start?: number, end?: number) => BlobLike;
}

export interface CancellationToken {
  isCancelled: boolean;
}

export interface UploadProgress {
  bytesSent: number;
  bytesTotal: number;
  progress: number;
}

export type UploadSource = NodeJS.ReadableStream | BlobLike | Buffer | string;

export interface UploadManagerParams extends Omit<BeginMultipartUploadRequest, "size" | "protocol"> {
  cancellationToken?: CancellationToken;
  data: UploadSource;
  maxConcurrentUploadParts?: number;
  onProgress?: (status: UploadProgress) => void;

  /**
   * Only required if 'data' is a 'ReadableStream'.
   */
  size?: number;
}
