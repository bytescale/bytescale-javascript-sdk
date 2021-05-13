export interface UploadedFile {
  accountId: string;
  file: File;
  fileId: string;
  fileUrl: string;
  mime: string | undefined;
  tag: string | undefined;
  userId: string | undefined;
}
