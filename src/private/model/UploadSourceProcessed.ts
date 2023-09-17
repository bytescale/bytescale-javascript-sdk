import { BlobLike } from "../../public/shared/CommonTypes";
import { NodeChunkedStream } from "../NodeChunkedStream";

export interface UploadSourceBlob {
  type: "Blob";
  value: BlobLike;
}
export interface UploadSourceBuffer {
  type: "Buffer";
  value: Buffer;
}
export interface UploadSourceArrayBuffer {
  type: "ArrayBuffer";
  value: ArrayBuffer;
}
export interface UploadSourceStream {
  type: "Stream";
  value: NodeChunkedStream;
}

export type UploadSourceProcessedIsomorphic = UploadSourceBlob | UploadSourceArrayBuffer;
export type UploadSourceProcessedBrowser = UploadSourceProcessedIsomorphic;
export type UploadSourceProcessedWorker = UploadSourceProcessedIsomorphic;
export type UploadSourceProcessedNode = UploadSourceStream | UploadSourceBuffer | UploadSourceProcessedIsomorphic;
