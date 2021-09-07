import { CancellablePromise } from "upload-js/CommonTypes";
import { Cancellation } from "upload-js/Errors";
import { UploadConfig } from "upload-js/UploadConfig";
import { FilesService, UploadPart, OpenAPI } from "upload-api-client-upload-js";
import { UploadParams } from "upload-js/UploadParams";

const apiUrlOverride: string | undefined = (window as any).UPLOAD_JS_API_URL;
const apiUrl: string = apiUrlOverride !== undefined ? apiUrlOverride : "https://api.upload.io";

const cdnUrlOverride: string | undefined = (window as any).UPLOAD_JS_CDN_URL;
const cdnUrl: string = cdnUrlOverride !== undefined ? cdnUrlOverride : "https://cdn.upload.io";

type AddCancellationHandler = (cancellationHandler: () => void) => void;

export class Upload {
  private readonly maxUploadConcurrency = 5;

  constructor(private readonly config: UploadConfig) {}

  createFileHandler(
    params: UploadParams & {
      onError?: (reason: any) => void;
      onUpload: (url: string) => void;
    }
  ): (file: Event) => void {
    return (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.files === undefined || input.files === null) {
        throw new Error(
          "No property 'files' on input element: ensure 'createFileHandler' is set to the 'onchange' attribute on an input of type 'file'."
        );
      }
      if (input.files[0] === undefined) {
        throw new Error("No file selected.");
      }

      this.uploadFile({ ...params, file: input.files[0] }).promise.then(
        ({ uploadedFileURL }) => params.onUpload(uploadedFileURL),
        error => {
          if (params.onError !== undefined) {
            params.onError(error);
          } else {
            console.error(
              "Cannot upload file. To remove this console message, handle the error explicitly by providing an 'onError' parameter: upload.createFileHandler({onUpload, onError})",
              error
            );
          }
        }
      );
    };
  }

  uploadFile(params: UploadParams & { file: File }): CancellablePromise<{ uploadedFileURL: string }> {
    // Initial progress, raised immediately and synchronously.
    const cancellationHandlers: Array<() => void> = [];
    const addCancellationHandler: AddCancellationHandler = (ca: () => void): void => {
      cancellationHandlers.push(ca);
    };
    const cancel = (): void => cancellationHandlers.forEach(x => x());

    return {
      promise: this.beginFileUpload(params.file, params, addCancellationHandler).catch(e => {
        cancel();
        throw e;
      }),
      cancel
    };
  }

  private async beginFileUpload(
    file: File,
    params: UploadParams,
    addCancellationHandler: AddCancellationHandler
  ): Promise<{ uploadedFileURL: string }> {
    if (params.progress !== undefined) {
      params.progress({ bytesSent: 0, bytesTotal: file.size });
    }
    this.preflight();
    const uploadMetadata = await FilesService.beginUpload({
      fileSize: file.size,
      fileName: file.name,
      mime: this.normalizeMimeType(file.type),
      tag: params.tag,
      userId: params.userId
    });

    const incUploadIndex: () => number | undefined = (() => {
      let lastUploadIndex: number = 0;
      return () => {
        if (lastUploadIndex === uploadMetadata.uploadParts.count - 1) {
          return undefined;
        }
        return ++lastUploadIndex;
      };
    })();

    const nextPartQueue = [uploadMetadata.uploadParts.first];
    const getNextPart: () => Promise<UploadPart | undefined> = async () => {
      if (nextPartQueue.length > 0) {
        return nextPartQueue.pop();
      }
      const uploadPartIndex = incUploadIndex();
      if (uploadPartIndex === undefined) {
        return undefined;
      }
      this.preflight();
      return await FilesService.getUploadPart(uploadMetadata.fileId, uploadPartIndex);
    };

    const bytesSentByEachWorker: number[] = [];
    const uploadNextPart: (workerIndex: number) => Promise<void> = async workerIndex => {
      const nextPart = await getNextPart();
      if (nextPart !== undefined) {
        let lastBytesSent = 0;
        const progress: (status: { bytesSent: number; bytesTotal: number }) => void = ({ bytesSent }) => {
          if (bytesSentByEachWorker[workerIndex] === undefined) {
            bytesSentByEachWorker[workerIndex] = bytesSent;
          } else {
            bytesSentByEachWorker[workerIndex] -= lastBytesSent;
            bytesSentByEachWorker[workerIndex] += bytesSent;
            lastBytesSent = bytesSent;
          }

          if (params.progress !== undefined) {
            const totalBytesSent = bytesSentByEachWorker.reduce((a, b) => a + b);
            params.progress({ bytesSent: totalBytesSent, bytesTotal: file.size });
          }
        };
        await this.uploadPart(file, nextPart, progress, addCancellationHandler);
        await uploadNextPart(workerIndex);
      }
    };

    await Promise.all(
      [...Array(this.maxUploadConcurrency).keys()].map(async workerIndex => await uploadNextPart(workerIndex))
    );

    return {
      uploadedFileURL: `${cdnUrl}/${uploadMetadata.fileId}`
    };
  }

  private normalizeMimeType(mime: string): string | undefined {
    const normal = mime.toLowerCase();
    const regex = /^[a-z0-9]+\/[a-z0-9+\-._]+$/; // Sync with 'MimeTypeUnboxed' in 'upload/api'.
    return regex.test(normal) ? normal : undefined;
  }

  /**
   * Call before every request. Since the connector is configured through global config, other code may have changed
   * these since we last set them. (I.e. consider two instances of this class, configured with different API keys, and
   * an upload is initiated on each of them at the same time...).
   */
  private preflight(): void {
    OpenAPI.BASE = apiUrl;
    OpenAPI.WITH_CREDENTIALS = true;
    OpenAPI.USERNAME = "apikey";
    OpenAPI.PASSWORD = this.config.apiKey;
  }

  private async putUploadPart(
    url: string,
    content: Blob,
    progress: (status: { bytesSent: number; bytesTotal: number }) => void,
    addCancellationHandler: AddCancellationHandler
  ): Promise<{ etag: string }> {
    const xhr = new XMLHttpRequest();
    let pending = true;
    addCancellationHandler(() => {
      if (pending) {
        xhr.abort();
      }
    });

    try {
      return await new Promise<{ etag: string }>((resolve, reject) => {
        xhr.upload.addEventListener(
          "progress",
          evt => {
            if (evt.lengthComputable) {
              progress({ bytesSent: evt.loaded, bytesTotal: evt.total });
            }
          },
          false
        );
        xhr.addEventListener("load", () => {
          // Ensure we always report the progress of a finished upload as 100%.
          progress({ bytesSent: content.size, bytesTotal: content.size });

          if (Math.floor(xhr.status / 100) === 2) {
            const etag = xhr.getResponseHeader("etag");

            if (etag === null || etag === undefined) {
              reject(new Error(`File upload error: no etag header in upload response.`));
            } else {
              resolve({ etag });
            }
          } else {
            reject(new Error(`File upload error: status code ${xhr.status}`));
          }
        });

        xhr.onabort = () => reject(new Cancellation("File upload cancelled."));
        xhr.onerror = () => reject(new Error("File upload error."));
        xhr.ontimeout = () => reject(new Error("File upload timeout."));

        xhr.open("PUT", url);
        xhr.send(content);
      });
    } finally {
      pending = false;
    }
  }

  private async uploadPart(
    file: File,
    part: UploadPart,
    progress: (status: { bytesSent: number; bytesTotal: number }) => void,
    addCancellationHandler: AddCancellationHandler
  ): Promise<void> {
    const content: Blob =
      part.range.inclusiveEnd === -1 ? new Blob() : file.slice(part.range.inclusiveStart, part.range.inclusiveEnd + 1);

    const { etag } = await this.putUploadPart(part.uploadUrl, content, progress, addCancellationHandler);

    this.preflight();
    await FilesService.completeUploadPart(part.fileId, part.uploadPartIndex, {
      etag
    });
  }
}
