import { UploadParams } from "upload-js/UploadParams";
import { FileLike } from "upload-js/FileLike";

export type UploadParamsWithFile = UploadParams & { file: FileLike };
