import { JsonObject, FilePathDefinition } from "@upload-io/upload-api-client-upload-js";

export interface UploadParams {
  metadata?: JsonObject;
  onBegin?: (params: { cancel: () => void }) => void;
  onProgress?: (status: { bytesSent: number; bytesTotal: number; progress: number }) => void;
  path?: FilePathDefinition;
  tags?: string[];
}
