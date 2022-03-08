import { FileTag } from "@upload-io/upload-api-client-upload-js/src/models/FileTag";
import { FileLike } from "upload-js/FileLike";
import { SuggestedOptimization } from "upload-js/SuggestedOptimization";

export interface UploadedFile {
  accountId: string;
  file: FileLike;
  fileId: string;
  fileSize: number;
  fileUrl: string;
  mime: string;
  suggestedOptimization: SuggestedOptimization | undefined;
  tags: FileTag[];
}
