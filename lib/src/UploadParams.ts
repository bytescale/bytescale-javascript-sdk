import { FileTag } from "@upload-io/upload-api-client-upload-js/src/models/FileTag";

export interface UploadParams {
  onBegin?: (params: { cancel: () => void }) => void;
  onProgress?: (status: { bytesSent: number; bytesTotal: number; progress: number }) => void;
  tags?: Array<string | FileTag>;
}
