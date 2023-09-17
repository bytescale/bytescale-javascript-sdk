import { UploadManagerParams } from "../../public/shared/CommonTypes";
import { FileDetails } from "../../public/shared/generated";

export interface UploadManagerInterface {
  upload: (request: UploadManagerParams) => Promise<FileDetails>;
}
