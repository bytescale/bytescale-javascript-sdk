import { FileLike } from "upload-js/FileLike";
import { FileDetails } from "@upload-io/upload-api-client-upload-js";

export interface UploadedFile extends FileDetails {
  accountId: string;
  file: FileLike;
}
