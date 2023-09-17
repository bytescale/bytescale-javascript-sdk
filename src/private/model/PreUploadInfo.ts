export interface PreUploadInfo {
  maxConcurrentUploadParts: number;
  mime: string | undefined;
  originalFileName: string | undefined;
  size: number;
}
