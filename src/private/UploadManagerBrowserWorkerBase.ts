import { UploadManagerBase } from "./UploadManagerBase";
import { UploadSourceProcessedBrowser, UploadSourceProcessedWorker } from "./model/UploadSourceProcessed";
import { PreUploadInfo } from "./model/PreUploadInfo";
import { UploadPart } from "../public/shared/generated";
import { assertUnreachable } from "./TypeUtils";
import { BlobLike, UploadManagerParams, UploadSource } from "../public/shared/CommonTypes";

type BrowserOrWorkerUploadSource = UploadSourceProcessedBrowser | UploadSourceProcessedWorker;

/**
 * The "browser" and "worker" runtimes support the same input types, but the former uses XHR and the latter uses Fetch.
 */
export abstract class UploadManagerBrowserWorkerBase extends UploadManagerBase<BrowserOrWorkerUploadSource, undefined> {
  protected processUploadSource(data: UploadSource): BrowserOrWorkerUploadSource {
    if (typeof data === "string") {
      // 'Blob' must be from 'global' (i.e. not imported) as we're in a browser context here, so is globally available.
      return { type: "Blob", value: new Blob([data], { type: this.stringMimeType }) };
    }
    if ((data as Partial<ArrayBuffer>).byteLength !== undefined) {
      return { type: "ArrayBuffer", value: data as ArrayBuffer };
    }
    if ((data as Partial<BlobLike>).size !== undefined) {
      return { type: "Blob", value: data as BlobLike };
    }

    throw new Error(
      `Unsupported type for 'data' parameter. Please provide a String, Blob, ArrayBuffer, or File object (from a file input element).`
    );
  }

  protected getPreUploadInfoPartial(
    _request: UploadManagerParams,
    data: BrowserOrWorkerUploadSource
  ): Partial<PreUploadInfo> & { size: number } {
    switch (data.type) {
      case "Blob":
        return this.getBlobInfo(data);
      case "ArrayBuffer":
        return {
          mime: undefined,
          size: data.value.byteLength,
          originalFileName: undefined,
          maxConcurrentUploadParts: undefined
        };
      default:
        assertUnreachable(data);
    }
  }

  protected preUpload(_source: BrowserOrWorkerUploadSource): undefined {
    return undefined;
  }

  protected async postUpload(_init: undefined): Promise<void> {
    // NO-OP.
  }

  protected getRequestBody(part: UploadPart, blob: BrowserOrWorkerUploadSource): Blob | ArrayBuffer {
    return part.range.inclusiveEnd === -1
      ? new Blob()
      : (blob.value.slice(part.range.inclusiveStart, part.range.inclusiveEnd + 1) as Blob | ArrayBuffer);
  }
}
