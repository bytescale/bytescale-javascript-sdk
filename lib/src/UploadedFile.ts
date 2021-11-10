import { FileTag } from "@upload-io/upload-api-client-upload-js/src/models/FileTag";

export interface UploadedFile {
  accountId: string;
  file: File;
  fileId: string;
  fileSize: number;
  fileUrl: string;
  mime: string;
  tags: FileTag[];
}
