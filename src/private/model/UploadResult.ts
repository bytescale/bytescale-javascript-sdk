import { FileDetails } from "../../public/shared/generated";

export type UploadResult = Omit<FileDetails, "etag"> & {
  /**
   * The file's ETag, short for "entity tag", reflects the file's version and changes whenever the file is modified.
   */
  etag: string;
};
