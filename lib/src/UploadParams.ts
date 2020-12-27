export interface UploadParams {
  progress?: (status: { bytesSent: number; bytesTotal: number }) => void;
  tag?: string;
  userId?: string;
}
