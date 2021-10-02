export interface UploadedFile {
  accountId: string;
  file: File;
  fileId: string;
  fileSize: number;
  fileUrl: string;
  mime: string;
  tag: string | undefined;
  userId: string | undefined;
}
