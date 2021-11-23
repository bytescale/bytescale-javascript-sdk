import { FileTag } from "@upload-io/upload-api-client-upload-js/src/models/FileTag";
import { FileLike } from "upload-js/FileLike";

export interface UploadedFile {
  accountId: string;
  file: FileLike;
  fileId: string;
  fileSize: number;
  fileUrl: string;
  mime: string;
  tags: FileTag[];
}
