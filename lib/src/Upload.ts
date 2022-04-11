import { Cancellation } from "upload-js/Errors";
import { UploadConfig } from "upload-js/UploadConfig";
import {
  FilesService,
  UploadPart,
  OpenAPI,
  AccountId,
  ErrorResponse,
  request,
  FileTag,
  ApiError
} from "@upload-io/upload-api-client-upload-js";
import { UploadParams } from "upload-js/UploadParams";
import { BeginUploadRequest } from "@upload-io/upload-api-client-upload-js/src/models/BeginUploadRequest";
import { UploadedFile } from "upload-js/UploadedFile";
import { FileInputChangeEvent } from "upload-js/FileInputChangeEvent";
import { FileSummary } from "@upload-io/upload-api-client-upload-js/src/models/FileSummary";
import { SetAccessTokenResponseDto } from "upload-js/dtos/SetAccessTokenResponseDto";
import { SetAccessTokenRequestDto } from "upload-js/dtos/SetAccessTokenRequestDto";
import { AuthSession } from "upload-js/AuthSession";
import { ApiRequestOptions } from "@upload-io/upload-api-client-upload-js/src/core/ApiRequestOptions";
import { ApiResult } from "@upload-io/upload-api-client-upload-js/src/core/ApiResult";
import { Mutex } from "upload-js/Mutex";
import { FileLike } from "upload-js/FileLike";
import { ProgressSmoother } from "progress-smoother";
import { UploadError } from "upload-js/UploadError";
import { UploadParamsWithFile } from "upload-js/UploadParamsWithFile";

type AddCancellationHandler = (cancellationHandler: () => void) => void;

/**
 * You must only instantiate one instance of this class in your web app.
 *
 * This is particularly important when using the 'beginAuthSession' and 'endAuthSession' methods.
 */
export class Upload {
  private readonly accountId: AccountId;
  private readonly accountIdLength = 7; // Sync with: upload/shared/**/AccountIdUtils
  private readonly specialApiKeyAccountId = "W142hJk";
  private readonly specialApiKeys = ["free", "demo"];
  private readonly apiKeyPrefix = "public_";
  private readonly apiUrl: string;
  private readonly authenticateWithApiKey: boolean;
  private readonly cdnUrl: string;
  private readonly debugMode: boolean;
  private readonly headers: (() => Promise<Record<string, string>>) | undefined;
  private readonly maxUploadConcurrency = 5;
  private readonly refreshBeforeExpirySeconds = 20;
  private readonly onProgressInterval = 100;
  private readonly retryAuthAfterErrorSeconds = 5;
  private readonly accessTokenPathBase = "/api/v1/access_tokens/";
  private readonly authMutex = new Mutex();

  private lastAuthSession: AuthSession | undefined = undefined;

  constructor(private readonly config: UploadConfig) {
    if ((config ?? undefined) === undefined) {
      throw new Error("[upload-js] Please provide a configuration object to the constructor.");
    }

    if (config.debug === true) {
      console.log(`[upload-js] Initialized with API key '${config.apiKey}'`);
    }
    this.apiUrl = config.internal?.apiUrl ?? "https://api.upload.io";
    this.cdnUrl = config.internal?.cdnUrl ?? "https://upcdn.io";
    this.authenticateWithApiKey = config.internal?.authenticateWithApiKey ?? true;
    this.headers = config.internal?.headers;
    this.debugMode = config.debug === true;

    if ((config.apiKey ?? undefined) === undefined) {
      throw new Error("[upload-js] Please provide an API key via the 'apiKey' config parameter.");
    }

    if (config.apiKey.trim() !== config.apiKey) {
      // We do not support API keys with whitespace (by trimming ourselves) because otherwise we'd need to support this
      // everywhere in perpetuity (since removing the trimming would be a breaking change).
      throw new Error(
        "[upload-js] Please enter a valid API key: whitespace was detected in your API key, please remove it and try again."
      );
    }

    // Non-api-key authentication is required by Upload Dashboard, which uses bearer tokens instead of API keys because
    // the user may not have any active API keys, but might still want to upload files via the Upload Dashboard.
    if (config.internal?.authenticateWithApiKey === false) {
      this.accountId = config.internal.accountId;
    } else {
      if (this.specialApiKeys.includes(config.apiKey)) {
        this.accountId = this.specialApiKeyAccountId;
      } else {
        if (!config.apiKey.startsWith(this.apiKeyPrefix)) {
          throw new Error(`[upload-js] Please enter a valid API key: it must begin with "${this.apiKeyPrefix}".`);
        }

        this.accountId = config.apiKey.substr(this.apiKeyPrefix.length, this.accountIdLength);

        if (this.accountId.length !== this.accountIdLength) {
          throw new Error(
            `[upload-js] Please enter a valid API key: it must be at least ${
              this.apiKeyPrefix.length + this.accountIdLength
            } characters long, but the API key you provided is ${this.apiKeyPrefix.length + this.accountId.length}.`
          );
        }
      }
    }
  }

  /**
   * Call after a user has signed-in to your web app.
   *
   * Allows the user to perform authenticated uploads and/or downloads to the Upload CDN.
   *
   * You must await the promise before attempting to perform any uploads or downloads that require authentication.
   *
   * Method safety:
   * - IS idempotent: you may call this method multiple times, contiguously. (The previous auth session will be ended.)
   * - IS reentrant: can be called before another *AuthSession method has finished executing.
   *
   * @param authUrl The fully-qualified URL for your backend API's auth endpoint.
   * @param authHeaders Headers to send to your backend API.
   *                    IMPORTANT: do not call '*AuthSession' inside this callback, as this will cause a deadlock.
   */
  async beginAuthSession(authUrl: string, authHeaders: () => Promise<Record<string, string>>): Promise<void> {
    await this.endAuthSession();

    const authSession: AuthSession = {
      accessToken: undefined,
      accessTokenRefreshHandle: undefined,
      isActive: true
    };

    // Does not need to be inside the mutex since the environment is single-threaded, and we have not async-yielded
    // since the mutex from 'endAuthSession' was relinquished (meaning we still have execution, so we know a) nothing
    // can interject and b) nothing has interjected since the lock was relinquished).
    this.lastAuthSession = authSession;

    await this.refreshAccessToken(authUrl, authHeaders, authSession);
  }

  /**
   * Call after the user signs-out of your web app.
   *
   * Method safety:
   * - IS idempotent: you may call this method multiple times, contiguously.
   * - IS reentrant: can be called before another *AuthSession method has finished executing
   */
  async endAuthSession(): Promise<void> {
    await this.authMutex.safe(async () => {
      if (this.lastAuthSession === undefined) {
        return;
      }

      const authSession = this.lastAuthSession;
      this.lastAuthSession = undefined;

      if (authSession.accessTokenRefreshHandle !== undefined) {
        clearTimeout(authSession.accessTokenRefreshHandle);
      }

      authSession.isActive = false;

      await this.deleteAccessToken();
    });
  }

  createFileInputHandler(
    params: UploadParams & {
      onError?: (reason: any) => void;
      onUploaded: (result: UploadedFile) => void;
    }
  ): (file: FileInputChangeEvent) => void {
    return (event: FileInputChangeEvent) => {
      const input = event.target;
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

  async uploadFile(paramsOrFile: UploadParamsWithFile | FileLike): Promise<UploadedFile> {
    // Initial progress (raised immediately and synchronously).
    const cancellationHandlers: Array<() => void> = [];
    const addCancellationHandler: AddCancellationHandler = (ca: () => void): void => {
      cancellationHandlers.push(ca);
    };
    const cancel = (): void => cancellationHandlers.forEach(x => x());

    const params: UploadParamsWithFile = FileLike.is(paramsOrFile) ? { file: paramsOrFile } : paramsOrFile;

    if (params.onBegin !== undefined) {
      params.onBegin({ cancel });
    }

    try {
      return await this.beginFileUpload(params.file, params, addCancellationHandler);
    } catch (e) {
      cancel();
      if (e instanceof ApiError) {
        const errorResponseMaybe = e.body as Partial<ErrorResponse> | undefined;
        if (typeof errorResponseMaybe?.error?.code === "string") {
          throw new UploadError(errorResponseMaybe as ErrorResponse);
        }
      }
      throw e;
    }
  }

  url(fileId: string, transformationSlug?: string): string {
    const fileUrl = `${this.cdnUrl}/${fileId}`;
    return transformationSlug === undefined ? fileUrl : `${fileUrl}/${transformationSlug}`;
  }

  private async withProgressReporting<T>(
    tickInterval: number,
    tick: (stopTicking: () => void) => void,
    scope: () => Promise<T>
  ): Promise<T> {
    let whileReportingResolved: () => void;
    const whileReporting = new Promise<void>(resolve => {
      whileReportingResolved = resolve;
    });
    let isReporting = true;
    const stopReporting = (): void => {
      if (isReporting) {
        whileReportingResolved();
        clearInterval(intervalHandle);
        isReporting = false;
      }
    };
    const intervalHandle: number = setInterval(() => tick(stopReporting), tickInterval) as any;
    try {
      const result = await scope();
      await whileReporting;
      return result;
    } finally {
      stopReporting();
    }
  }

  private async beginFileUpload(
    file: FileLike,
    params: UploadParams,
    addCancellationHandler: AddCancellationHandler
  ): Promise<UploadedFile> {
    const progressSmoother = ProgressSmoother({
      maxValue: file.size,
      teardownTime: 1000, // Accounts for the 'finalizeUpload' request to the Upload API.
      minDelayUntilFirstValue: 2000, // Accounts for the 'beginUpload' request to the Upload API.
      valueIncreaseDelta: 200 * 1024, // An estimated 200KB per XHR progress callback.
      valueIncreaseRatePerSecond: 50 * 1024, // 50kB/sec worse-case connection (anything beyond we'll consider an outlier).
      averageTimeBetweenValues: 1000 // When running, XHR should (hopefully) report at least every second, regardless of connection speed.
    });

    const reportProgress = (stopReportingProgress: () => void): void => {
      if (params.onProgress === undefined) {
        stopReportingProgress(); // Important to call this, as outer function awaits this call when the download ends.
      } else {
        const bytesSent = progressSmoother.smoothedValue();
        const bytesTotal = file.size;
        if (bytesSent === bytesTotal) {
          stopReportingProgress();
        }
        params.onProgress({ bytesSent, bytesTotal, progress: Math.round((bytesSent / bytesTotal) * 100) });
      }
    };

    return await this.withProgressReporting(this.onProgressInterval, reportProgress, async () => {
      const uploadRequest: BeginUploadRequest = {
        accountId: this.accountId,
        fileSize: file.size,
        fileName: file.name,
        mime: this.normalizeMimeType(file.type),
        tags: (params.tags ?? []).map((x): FileTag => (typeof x === "string" ? { name: x, searchable: true } : x))
      };

      this.debug(`Initiating file upload. Params = ${JSON.stringify(uploadRequest)}`);

      this.preflight();
      const uploadMetadata = await FilesService.beginMultipartUpload(uploadRequest);
      const isMultipart = uploadMetadata.uploadParts.count > 1;

      this.debug(`Initiated file upload. Metadata = ${JSON.stringify(uploadMetadata)}`);

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
      const getNextPart: (workerIndex: number) => Promise<UploadPart | undefined> = async workerIndex => {
        const nextPart = nextPartQueue.pop();
        if (nextPart !== undefined) {
          this.debug(`Dequeued part ${nextPart.uploadPartIndex}.`, workerIndex);
          return nextPart;
        }
        const uploadPartIndex = incUploadIndex();
        if (uploadPartIndex === undefined) {
          this.debug("No parts remaining.", workerIndex);
          return undefined;
        }
        this.preflight();
        this.debug(`Fetching metadata for part ${uploadPartIndex}.`, workerIndex);
        return await FilesService.getUploadPart(uploadMetadata.file.fileId, uploadPartIndex);
      };

      const bytesSentByEachWorker: number[] = [];
      const uploadNextPart: (workerIndex: number) => Promise<void> = async workerIndex => {
        const nextPart = await getNextPart(workerIndex);
        if (nextPart !== undefined) {
          let lastBytesSent = 0;
          const progress: (status: { bytesSent: number; bytesTotal: number }) => void = ({ bytesSent }) => {
            if (bytesSentByEachWorker[workerIndex] === undefined) {
              bytesSentByEachWorker[workerIndex] = bytesSent;
            } else {
              bytesSentByEachWorker[workerIndex] -= lastBytesSent;
              bytesSentByEachWorker[workerIndex] += bytesSent;
            }

            lastBytesSent = bytesSent;

            const totalBytesSent = bytesSentByEachWorker.reduce((a, b) => a + b);
            progressSmoother.setValue(totalBytesSent);
          };
          await this.uploadPart(
            file,
            uploadMetadata.file,
            isMultipart,
            nextPart,
            progress,
            addCancellationHandler,
            workerIndex
          );
          await uploadNextPart(workerIndex);
        }
      };

      await Promise.all(
        [...Array(this.maxUploadConcurrency).keys()].map(async workerIndex => await uploadNextPart(workerIndex))
      );

      const uploadedFile: UploadedFile = {
        accountId: uploadRequest.accountId,
        file,
        fileId: uploadMetadata.file.fileId,
        fileSize: uploadMetadata.file.size,
        fileUrl: this.url(uploadMetadata.file.fileId),
        tags: uploadMetadata.file.tags,
        mime: uploadMetadata.file.mime,
        suggestedOptimization:
          uploadMetadata.suggestedOptimizationUrlSlug === undefined
            ? undefined
            : {
                transformationSlug: uploadMetadata.suggestedOptimizationUrlSlug,
                transformationUrl: this.url(uploadMetadata.file.fileId, uploadMetadata.suggestedOptimizationUrlSlug)
              }
      };

      this.debug(`FileLike upload completed. FileLike = ${JSON.stringify(uploadedFile)}`);

      return uploadedFile;
    });
  }

  private debug(message: string, workerIndex?: number): void {
    if (this.debugMode) {
      console.log(`[upload-js] ${message}${workerIndex !== undefined ? ` (Worker ${workerIndex})` : ""}`);
    }
  }

  private error(message: string): void {
    console.error(`[upload-js] ${message}`);
  }

  private normalizeMimeType(mime: string): string | undefined {
    const normal = mime.toLowerCase();
    const regex = /^[a-z0-9]+\/[a-z0-9+\-._]+$/; // Sync with 'MimeTypeUnboxed' in 'upload/api'.
    return regex.test(normal) ? normal : undefined;
  }

  /**
   * Call before every Upload API request. Since the connector is configured through global config, other code may have
   * changed these since we last set them. (I.e. consider two instances of this class, configured with different API
   * keys, and an upload is initiated on each of them at the same time...).
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

    const headers = this.headers;
    const accessToken = this.lastAuthSession?.accessToken;

    if (headers !== undefined || accessToken !== undefined) {
      OpenAPI.HEADERS = async (): Promise<Record<string, string>> => {
        const headersFromConfig = headers === undefined ? {} : await headers();
        const accessToken = this.lastAuthSession?.accessToken; // Re-fetch as there's been an async boundary so state may have changed.
        return {
          ...headersFromConfig,
          ...(accessToken === undefined
            ? {}
            : {
                "authorization-user": accessToken
              })
        };
      };
    } else {
      delete OpenAPI.HEADERS;
    }
  }

  /**
   * Call before every non-Upload API request.
   */
  private preflightExternalApi(url: string, withCredentials: boolean): void {
    OpenAPI.BASE = url;
    OpenAPI.WITH_CREDENTIALS = withCredentials;
    delete OpenAPI.USERNAME;
    delete OpenAPI.PASSWORD;
    delete OpenAPI.HEADERS;
  }

  private async putUploadPart(
    url: string,
    summary: FileSummary,
    isMultipart: boolean,
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
              reject(new Error(`FileLike upload error: no etag header in upload response.`));
            } else {
              resolve({ etag });
            }
          } else {
            reject(new Error(`FileLike upload error: status code ${xhr.status}`));
          }
        });

        xhr.onabort = () => reject(new Cancellation("FileLike upload cancelled."));
        xhr.onerror = () => reject(new Error("FileLike upload error."));
        xhr.ontimeout = () => reject(new Error("FileLike upload timeout."));

        xhr.open("PUT", url);

        // Headers are set by the BE for multipart uploads.
        if (!isMultipart) {
          xhr.setRequestHeader("content-type", summary.mime);
          if (summary.name !== null) {
            xhr.setRequestHeader(
              "content-disposition",
              `inline; filename="${encodeURIComponent(summary.name)}"; filename*=UTF-8''${encodeURIComponent(
                summary.name
              )}`
            );
          }
        }

        xhr.send(content);
      });
    } finally {
      pending = false;
    }
  }

  private async uploadPart(
    file: FileLike,
    summary: FileSummary,
    isMultipart: boolean,
    part: UploadPart,
    progress: (status: { bytesSent: number; bytesTotal: number }) => void,
    addCancellationHandler: AddCancellationHandler,
    workerIndex: number
  ): Promise<void> {
    const content: Blob =
      part.range.inclusiveEnd === -1 ? new Blob() : file.slice(part.range.inclusiveStart, part.range.inclusiveEnd + 1);

    this.debug(`Uploading part ${part.uploadPartIndex}.`, workerIndex);

    const { etag } = await this.putUploadPart(
      part.uploadUrl,
      summary,
      isMultipart,
      content,
      progress,
      addCancellationHandler
    );

    this.preflight();
    await FilesService.completeUploadPart(part.fileId, part.uploadPartIndex, {
      etag
    });

    this.debug(`Uploaded part ${part.uploadPartIndex}.`, workerIndex);
  }

  private accessTokenPath(): string {
    return `${this.cdnUrl}${this.accessTokenPathBase}${this.accountId}`;
  }

  private async deleteAccessToken(): Promise<void> {
    await this.deleteNoResponse(
      this.accessTokenPath(),
      {},
      true // Required, else CDN response's `Set-Cookie` header will be silently ignored.
    );
  }

  private async refreshAccessToken(
    authUrl: string,
    authHeaders: () => Promise<Record<string, string>>,
    authSession: AuthSession
  ): Promise<void> {
    try {
      await this.authMutex.safe(async () => {
        // Session may have been ended while timer was waiting.
        if (!authSession.isActive) {
          return;
        }

        const token = await this.getText(authUrl, await authHeaders());
        const setTokenResult = this.handleApiError(
          await this.putJsonGetJson<SetAccessTokenResponseDto | ErrorResponse, SetAccessTokenRequestDto>(
            this.accessTokenPath(),
            {},
            {
              accessToken: token
            },
            true // Required, else CDN response's `Set-Cookie` header will be silently ignored.
          )
        );

        authSession.accessToken = setTokenResult.accessToken;
        authSession.accessTokenRefreshHandle = window.setTimeout(() => {
          this.refreshAccessToken(authUrl, authHeaders, authSession).then(
            () => {},
            e => this.error(`Permanent error when refreshing access token: ${e as string}`)
          );
        }, Math.max(0, (setTokenResult.ttlSeconds - this.refreshBeforeExpirySeconds) * 1000));
      });
    } catch (e) {
      // Perform attempts as part of same promise, rather than via a 'setTimeout' so that the 'beginAuthSession' only
      // returns once an auth session has been successfully established.
      this.debug(`Error when refreshing access token: ${e as string}`);
      await new Promise(resolve => setTimeout(resolve, this.retryAuthAfterErrorSeconds * 1000));

      // Todo: is this stack safe?
      await this.refreshAccessToken(authUrl, authHeaders, authSession);
    }
  }

  private async putJsonGetJson<TGet, TPost>(
    url: string,
    headers: Record<string, string>,
    requestBody: TPost,
    withCredentials: boolean
  ): Promise<TGet> {
    return (
      await this.nonUploadApiRequest(
        {
          method: "PUT",
          path: url,
          headers,
          body: requestBody
        },
        withCredentials
      )
    ).body;
  }

  private async getText(url: string, headers: Record<string, string>): Promise<string> {
    return (
      await this.nonUploadApiRequest(
        {
          method: "GET",
          path: url,
          headers
        },
        false
      )
    ).body;
  }

  private async deleteNoResponse(
    url: string,
    headers: Record<string, string>,
    withCredentials: boolean
  ): Promise<void> {
    await this.nonUploadApiRequest(
      {
        method: "DELETE",
        path: url,
        headers
      },
      withCredentials
    );
  }

  private handleApiError<T>(result: T | ErrorResponse): T {
    const errorMaybe: Partial<ErrorResponse> = result;
    if (errorMaybe.error !== undefined) {
      throw new Error(`[upload-js] ${errorMaybe.error.message}. (Code: ${errorMaybe.error.code})`);
    }

    return result as T;
  }

  private async nonUploadApiRequest(options: ApiRequestOptions, withCredentials: boolean): Promise<ApiResult> {
    this.preflightExternalApi(options.path, withCredentials);
    return await request({
      ...options,
      path: ""
    });
  }
}
