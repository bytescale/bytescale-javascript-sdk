export interface UploadedFile {
  accountId: string;
  file: File;
  fileId: string;
  fileSize: number;
  fileUrl: string;
  mime: string;
  tags: string[];
}
