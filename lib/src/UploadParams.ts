import { JsonObject } from "@upload-io/upload-api-client-upload-js/src/models/JsonObject";
import { FilePathDefinition } from "@upload-io/upload-api-client-upload-js/src/models/FilePathDefinition";

export interface UploadParams {
  filePath?: FilePathDefinition;
  metadata?: JsonObject;
  onBegin?: (params: { cancel: () => void }) => void;
  onProgress?: (status: { bytesSent: number; bytesTotal: number; progress: number }) => void;
  tags?: string[];
}
