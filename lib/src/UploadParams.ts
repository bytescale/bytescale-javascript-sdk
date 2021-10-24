import { FileTag } from "upload-api-client-upload-js/src/models/FileTag";

export interface UploadParams {
  onBegin?: (params: { cancel: () => void }) => void;
  onProgress?: (status: { bytesSent: number; bytesTotal: number }) => void;
  tags?: Array<string | FileTag>;
}
