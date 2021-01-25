export interface UploadParams {
  onProgress?: (status: { bytesSent: number; bytesTotal: number }) => void;
  tag?: string;
  userId?: string;
}
