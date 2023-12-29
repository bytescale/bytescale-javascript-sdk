import { ErrorResponse } from "@upload-io/upload-api-client-upload-js";

export class UploadApiError extends Error {
  public readonly errorCode: string;
  public readonly details: any | undefined;

  constructor(response: ErrorResponse) {
    super(response.error.message);

    this.errorCode = response.error.code;
    this.details = response.error.details;
  }
}
