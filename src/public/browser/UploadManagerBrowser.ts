import { UploadSourceProcessedBrowser } from "../../private/model/UploadSourceProcessed";
import { CancelledError, UploadPart } from "../shared/generated";
import { PutUploadPartResult } from "../../private/model/PutUploadPartResult";
import { AddCancellationHandler } from "../../private/model/AddCancellationHandler";
import { UploadManagerBrowserWorkerBase } from "../../private/UploadManagerBrowserWorkerBase";

export class UploadManager extends UploadManagerBrowserWorkerBase {
  protected async doPutUploadPart(
    part: UploadPart,
    _contentLength: number,
    source: UploadSourceProcessedBrowser,
    onProgress: (bytesSentDelta: number) => void,
    addCancellationHandler: AddCancellationHandler
  ): Promise<PutUploadPartResult> {
    const xhr = new XMLHttpRequest();
    let pending = true;
    addCancellationHandler(() => {
      if (pending) {
        xhr.abort();
      }
    });

    try {
      return await new Promise<PutUploadPartResult>((resolve, reject) => {
        xhr.upload.addEventListener(
          "progress",
          evt => {
            if (evt.lengthComputable) {
              onProgress(evt.loaded);
            }
          },
          false
        );
        xhr.addEventListener("load", () => {
          const etag = xhr.getResponseHeader("etag") ?? undefined;
          resolve({ etag, status: xhr.status });
        });

        xhr.onabort = () => reject(new CancelledError());
        xhr.onerror = () => reject(new Error("File upload error."));
        xhr.ontimeout = () => reject(new Error("File upload timeout."));

        xhr.open("PUT", part.uploadUrl);
        xhr.send(this.getRequestBody(part, source));
      });
    } finally {
      pending = false;
    }
  }
}
