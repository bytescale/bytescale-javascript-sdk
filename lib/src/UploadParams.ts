import { JsonObject, FilePathDefinition } from "@upload-io/upload-api-client-upload-js";

export interface UploadParams {
  filePath?: FilePathDefinition;
  metadata?: JsonObject;
  onBegin?: (params: { cancel: () => void }) => void;
  onProgress?: (status: { bytesSent: number; bytesTotal: number; progress: number }) => void;
  tags?: string[];
}
