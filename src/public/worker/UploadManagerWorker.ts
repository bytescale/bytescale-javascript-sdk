import { UploadSourceProcessedWorker } from "../../private/model/UploadSourceProcessed";
import { UploadPart } from "../shared/generated";
import { PutUploadPartResult } from "../../private/model/PutUploadPartResult";
import { AddCancellationHandler } from "../../private/model/AddCancellationHandler";
import { UploadManagerBrowserWorkerBase } from "../../private/UploadManagerBrowserWorkerBase";
import { UploadManagerFetchUtils } from "../../private/UploadManagerFetchUtils";

export class UploadManager extends UploadManagerBrowserWorkerBase {
  protected async doPutUploadPart(
    part: UploadPart,
    contentLength: number,
    source: UploadSourceProcessedWorker,
    _onProgress: (bytesSentDelta: number) => void,
    addCancellationHandler: AddCancellationHandler
  ): Promise<PutUploadPartResult> {
    return await UploadManagerFetchUtils.doPutUploadPart(
      this.config,
      part,
      this.getRequestBody(part, source),
      contentLength,
      addCancellationHandler
    );
  }
}
