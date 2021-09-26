import { Cancellation } from "upload-js/Errors";
import { UploadConfig } from "upload-js/UploadConfig";
import { FilesService, UploadPart, OpenAPI, AccountId } from "upload-api-client-upload-js";
import { UploadParams } from "upload-js/UploadParams";
import { BeginUploadRequest } from "upload-api-client-upload-js/src/models/BeginUploadRequest";
import { UploadResult } from "upload-js/UploadResult";

type AddCancellationHandler = (cancellationHandler: () => void) => void;

export class Upload {
  private readonly accountId: AccountId;
  private readonly accountIdLength = 9; // Sync with: upload/shared/**/AccountIdUtils
  private readonly apiKeyPrefix = "public_";
  private readonly apiUrl: string;
  private readonly authenticateWithApiKey: boolean;
  private readonly cdnUrl: string;
  private readonly debugMode: boolean;
  private readonly headers: (() => Promise<Record<string, string>>) | undefined;
  private readonly maxUploadConcurrency = 5;

  constructor(private readonly config: UploadConfig) {
    if (config.debug === true) {
      console.log(`[upload-js] Initialized with API key '${config.apiKey}'`);
    }
    this.apiUrl = config.internal?.apiUrl ?? "https://api.upload.io";
    this.cdnUrl = config.internal?.cdnUrl ?? "https://cdn.upload.io";
    this.authenticateWithApiKey = config.internal?.authenticateWithApiKey ?? true;
    this.headers = config.internal?.headers;
    this.debugMode = config.debug === true;

    if (config.apiKey.trim() !== config.apiKey) {
      // We do not support API keys with whitespace (by trimming ourselves) because otherwise we'd need to support this
      // everywhere in perpetuity (since removing the trimming would be a breaking change).
      throw new Error(
        "[upload-js] Invalid API key. Whitespace detected: please remove whitespace from the API key and try again."
      );
    }

    // Non-api-key authentication is required by Upload Dashboard, which uses bearer tokens instead of API keys because
    // the user may not have any active API keys, but might still want to upload files via the Upload Dashboard.
    if (config.internal?.authenticateWithApiKey === false) {
      this.accountId = config.internal.accountId;
    } else {
      if (!config.apiKey.startsWith(this.apiKeyPrefix)) {
        throw new Error(`[upload-js] Invalid API key. API keys must start with '${this.apiKeyPrefix}'`);
      }

      this.accountId = config.apiKey.substr(this.apiKeyPrefix.length, this.accountIdLength);

      if (this.accountId.length !== this.accountIdLength) {
        throw new Error(
          `[upload-js] Invalid API key. API keys must be at least ${
            this.apiKeyPrefix.length + this.accountIdLength
          } characters long, but the API key you provided is ${this.apiKeyPrefix.length + this.accountId.length}.`
        );
      }
    }
  }

  createFileInputHandler(
    params: UploadParams & {
      onError?: (reason: any) => void;
      onUploaded: (result: UploadResult) => void;
    }
  ): (file: Event) => void {
    return (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.files === undefined || input.files === null) {
        throw new Error(
          "No property 'files' on input element: ensure 'createFileInputHandler' is set to the 'onchange' attribute on an input of type 'file'."
        );
      }
      if (input.files[0] === undefined) {
        throw new Error("No file selected.");
      }

      this.uploadFile({ ...params, file: input.files[0] }).then(params.onUploaded, error => {
        if (params.onError !== undefined) {
          params.onError(error);
        } else {
          console.error(
            "Cannot upload file. To remove this console message, handle the error explicitly by providing an 'onError' parameter: upload.createFileInputHandler({onUploaded, onError})",
            error
          );
        }
      });
    };
  }

  async uploadFile(params: UploadParams & { file: File }): Promise<UploadResult> {
    // Initial progress, raised immediately and synchronously.
    const cancellationHandlers: Array<() => void> = [];
    const addCancellationHandler: AddCancellationHandler = (ca: () => void): void => {
      cancellationHandlers.push(ca);
    };
    const cancel = (): void => cancellationHandlers.forEach(x => x());

    if (params.onBegin !== undefined) {
      params.onBegin({ cancel });
    }

    try {
      return await this.beginFileUpload(params.file, params, addCancellationHandler);
    } catch (e) {
      cancel();
      throw e;
    }
  }

  url(fileId: string): string {
    return `${this.cdnUrl}/${fileId}`;
  }

  private async beginFileUpload(
    file: File,
    params: UploadParams,
    addCancellationHandler: AddCancellationHandler
  ): Promise<UploadResult> {
    if (params.onProgress !== undefined) {
      params.onProgress({ bytesSent: 0, bytesTotal: file.size });
    }

    const uploadRequest: BeginUploadRequest = {
      accountId: this.accountId,
      fileSize: file.size,
      fileName: file.name,
      mime: this.normalizeMimeType(file.type),
      tag: params.tag,
      userId: params.userId
    };

    if (this.debugMode) {
      console.log(`[upload-js] Initiating file upload. Params = ${JSON.stringify(uploadRequest)}`);
    }

    this.preflight();
    const uploadMetadata = await FilesService.beginUpload(uploadRequest);

    if (this.debugMode) {
      console.log(`[upload-js] Initiated file upload. Metadata = ${JSON.stringify(uploadMetadata)}`);
    }

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

          if (params.onProgress !== undefined) {
            const totalBytesSent = bytesSentByEachWorker.reduce((a, b) => a + b);
            params.onProgress({ bytesSent: totalBytesSent, bytesTotal: file.size });
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
      fileId: uploadMetadata.fileId,
      fileUrl: this.url(uploadMetadata.fileId)
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
    OpenAPI.BASE = this.apiUrl;
    if (this.authenticateWithApiKey) {
      OpenAPI.WITH_CREDENTIALS = true;
      OpenAPI.USERNAME = "apikey";
      OpenAPI.PASSWORD = this.config.apiKey;
    } else {
      OpenAPI.WITH_CREDENTIALS = false;
      delete OpenAPI.USERNAME;
      delete OpenAPI.PASSWORD;
    }
    if (this.headers !== undefined) {
      OpenAPI.HEADERS = this.headers;
    } else {
      delete OpenAPI.HEADERS;
    }
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

    if (this.debugMode) {
      console.log(`[upload-js] Uploading part ${part.uploadPartIndex}.`);
    }

    const { etag } = await this.putUploadPart(part.uploadUrl, content, progress, addCancellationHandler);

    this.preflight();
    await FilesService.completeUploadPart(part.fileId, part.uploadPartIndex, {
      etag
    });

    if (this.debugMode) {
      console.log(`[upload-js] Uploaded part ${part.uploadPartIndex}.`);
    }
  }
}
