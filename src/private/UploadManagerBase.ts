import {
  BeginMultipartUploadResponse,
  BytescaleApiClientConfig,
  BytescaleApiClientConfigUtils,
  CancelledError,
  CompleteMultipartUploadResponse,
  UploadApi,
  UploadPart
} from "../public/shared/generated";
import { UploadManagerInterface } from "./model/UploadManagerInterface";
import { OnPartProgress } from "./model/OnPartProgress";
import { PreUploadInfo } from "./model/PreUploadInfo";
import { UploadSourceBlob } from "./model/UploadSourceProcessed";
import { PutUploadPartResult } from "./model/PutUploadPartResult";
import { AddCancellationHandler } from "./model/AddCancellationHandler";
import { UploadResult } from "./model/UploadResult";
import { UploadManagerParams, UploadProgress, UploadSource } from "../public/shared/CommonTypes";

/**
 * Methods common to UploadManagerNode and UploadManagerBrowser.
 */
export abstract class UploadManagerBase<TSource, TInit> implements UploadManagerInterface {
  protected readonly stringMimeType = "text/plain";
  private readonly accountId: string;
  private readonly defaultMaxConcurrentUploadParts = 4;
  private readonly intervalMs = 500;
  private readonly uploadApi: UploadApi;

  constructor(protected readonly config: BytescaleApiClientConfig) {
    this.uploadApi = new UploadApi(config);
    this.accountId = BytescaleApiClientConfigUtils.getAccountId(config);
  }

  async upload(request: UploadManagerParams): Promise<UploadResult> {
    this.assertNotCancelled(request);

    const source = this.processUploadSource(request.data);
    const preUploadInfo = this.getPreUploadInfo(request, source);
    const bytesTotal = preUploadInfo.size;
    const makeOnProgressForPart = this.makeOnProgressForPartFactory(request, bytesTotal);
    const init = this.preUpload(source);

    // Raise initial progress event SYNCHRONOUSLY.
    if (request.onProgress !== undefined) {
      request.onProgress(this.makeProgressEvent(0, bytesTotal));
    }

    const uploadInfo = await this.beginUpload(request, preUploadInfo);
    const partCount = uploadInfo.uploadParts.count;
    const parts = [...Array(partCount).keys()];
    const { cancel, addCancellationHandler } = this.makeCancellationMethods();

    const intervalHandle = setInterval(this.onIntervalTick(request, cancel), this.intervalMs);
    let uploadedParts: CompleteMultipartUploadResponse[];
    try {
      uploadedParts = await this.mapAsync(
        parts,
        preUploadInfo.maxConcurrentUploadParts,
        async part =>
          await this.uploadPart(request, source, part, uploadInfo, makeOnProgressForPart(), addCancellationHandler)
      );
      await this.postUpload(init);
    } finally {
      clearInterval(intervalHandle);
    }

    const etag = uploadedParts.flatMap(x => (x.status === "Completed" ? [x.etag] : []))[0];
    return {
      ...uploadInfo.file,
      etag // The 'etag' in the original 'uploadInfo.file' will be null, so we set it to the final etag value here.
    };
  }

  protected getBlobInfo({ value: { name, size, type } }: UploadSourceBlob): Partial<PreUploadInfo> & { size: number } {
    return {
      // Some browsers/OSs return 'type: ""' for files with unknown MIME types, like HEICs, which causes a validation
      // error from the Bytescale API as "" is not a valid MIME type, so we coalesce to undefined here.
      mime: type === "" ? undefined : type,
      size,
      originalFileName: name,
      maxConcurrentUploadParts: undefined
    };
  }

  protected abstract processUploadSource(data: UploadSource): TSource;
  protected abstract getPreUploadInfoPartial(
    request: UploadManagerParams,
    source: TSource
  ): Partial<PreUploadInfo> & { size: number };
  protected abstract preUpload(source: TSource): TInit;
  protected abstract postUpload(init: TInit): Promise<void>;
  protected abstract doPutUploadPart(
    part: UploadPart,
    contentLength: number,
    source: TSource,
    onProgress: (bytesSentDelta: number) => void,
    addCancellationHandler: AddCancellationHandler
  ): Promise<PutUploadPartResult>;

  private onIntervalTick(request: UploadManagerParams, cancel: () => void): () => void {
    return () => {
      if (this.isCancelled(request)) {
        cancel();
      }
    };
  }

  private makeCancellationMethods(): { addCancellationHandler: AddCancellationHandler; cancel: () => void } {
    const cancellationHandlers: Array<() => void> = [];
    const addCancellationHandler: AddCancellationHandler = (ca: () => void): void => {
      cancellationHandlers.push(ca);
    };
    const cancel = (): void => cancellationHandlers.forEach(x => x());
    return { cancel, addCancellationHandler };
  }

  /**
   * Returns a callback, which when called, returns a callback that can be used by ONE specific part to report its progress.
   */
  private makeOnProgressForPartFactory(request: UploadManagerParams, bytesTotal: number): () => OnPartProgress {
    const { onProgress } = request;
    if (onProgress === undefined) {
      return () => () => {};
    }

    let bytesSent = 0;
    return () => {
      let bytesSentForPart = 0;
      return bytesSentTotalForPart => {
        const delta = bytesSentTotalForPart - bytesSentForPart;
        bytesSentForPart += delta;
        bytesSent += delta;
        onProgress(this.makeProgressEvent(bytesSent, bytesTotal));
      };
    };
  }

  private makeProgressEvent(bytesSent: number, bytesTotal: number): UploadProgress {
    return { bytesTotal, bytesSent, progress: Math.round((bytesSent / bytesTotal) * 100) };
  }

  private assertNotCancelled(request: UploadManagerParams): void {
    if (this.isCancelled(request)) {
      throw new CancelledError();
    }
  }

  private isCancelled(request: UploadManagerParams): boolean {
    return request.cancellationToken?.isCancelled === true;
  }

  private async beginUpload(
    request: UploadManagerParams,
    { size, mime, originalFileName }: PreUploadInfo
  ): Promise<BeginMultipartUploadResponse> {
    return await this.uploadApi.beginMultipartUpload({
      accountId: this.accountId,
      beginMultipartUploadRequest: {
        metadata: request.metadata,
        mime,
        originalFileName,
        path: request.path,
        protocol: "1.1",
        size,
        tags: request.tags
      }
    });
  }

  private async uploadPart(
    request: UploadManagerParams,
    source: TSource,
    partIndex: number,
    uploadInfo: BeginMultipartUploadResponse,
    onProgress: OnPartProgress,
    addCancellationHandler: AddCancellationHandler
  ): Promise<CompleteMultipartUploadResponse> {
    this.assertNotCancelled(request);
    const part = await this.getUploadPart(partIndex, uploadInfo);
    this.assertNotCancelled(request);
    const etag = await this.putUploadPart(part, source, onProgress, addCancellationHandler);
    this.assertNotCancelled(request);
    return await this.uploadApi.completeUploadPart({
      accountId: this.accountId,
      uploadId: uploadInfo.uploadId,
      uploadPartIndex: partIndex,
      completeUploadPartRequest: {
        etag
      }
    });
  }

  /**
   * Returns etag for the part.
   */
  private async putUploadPart(
    part: UploadPart,
    source: TSource,
    onProgress: OnPartProgress,
    addCancellationHandler: AddCancellationHandler
  ): Promise<string> {
    const contentLength = part.range.inclusiveEnd + 1 - part.range.inclusiveStart;
    const { status, etag } = await this.doPutUploadPart(
      part,
      contentLength,
      source,
      onProgress,
      addCancellationHandler
    );

    if (Math.floor(status / 100) !== 2) {
      throw new Error(`Failed to upload part (${status}).`);
    }

    if (etag === undefined) {
      throw new Error("No 'etag' response header found in upload part response.");
    }

    // Always send 100% for part, as some UploadManager implementations either don't report progress, or may not report the last chunk uploaded.
    onProgress(contentLength);

    return etag;
  }

  private async getUploadPart(partIndex: number, uploadInfo: BeginMultipartUploadResponse): Promise<UploadPart> {
    if (partIndex === 0) {
      return uploadInfo.uploadParts.first;
    }
    return await this.uploadApi.getUploadPart({
      uploadId: uploadInfo.uploadId,
      accountId: this.accountId,
      uploadPartIndex: partIndex
    });
  }

  private getPreUploadInfo(request: UploadManagerParams, source: TSource): PreUploadInfo {
    const partial = this.getPreUploadInfoPartial(request, source);
    return {
      maxConcurrentUploadParts: partial.maxConcurrentUploadParts ?? this.defaultMaxConcurrentUploadParts,
      originalFileName: request.originalFileName ?? partial.originalFileName,
      mime: request.mime ?? partial.mime,
      size: partial.size
    };
  }

  private async mapAsync<T, T2>(items: T[], concurrency: number, callback: (item: T) => Promise<T2>): Promise<T2[]> {
    const result: T2[] = [];
    const workQueue = [...items];
    await Promise.all(
      [...Array(concurrency).keys()].map(async () => {
        while (workQueue.length > 0) {
          const work = workQueue.shift(); // IMPORTANT: use 'shift' instead of 'pop' to ensure 'items' are processed in order when 'concurrency = 1'.
          if (work !== undefined) {
            result.push(await callback(work));
          }
        }
      })
    );
    return result;
  }
}
