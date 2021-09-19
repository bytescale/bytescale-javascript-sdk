export interface UploadParams {
  onBegin?: (params: { cancel: () => void }) => void;
  onProgress?: (status: { bytesSent: number; bytesTotal: number }) => void;
  tag?: string;
  userId?: string;
}
