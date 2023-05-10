import { UploadConfig } from "upload-js/UploadConfig";
import { UploadParams } from "upload-js/UploadParams";
import {
  ApiResult,
  request,
  AccountId,
  UploadPartV2,
  ErrorResponse,
  BeginUploadRequestV2,
  beginMultipartUpload,
  getUploadPart,
  completeUploadPart,
  ApiRequestOptions,
  Config
} from "@upload-io/upload-api-client-upload-js";
import { UploadedFile } from "upload-js/UploadedFile";
import { SetAccessTokenResponseDto } from "upload-js/dtos/SetAccessTokenResponseDto";
import { SetAccessTokenRequestDto } from "upload-js/dtos/SetAccessTokenRequestDto";
import { AuthSession } from "upload-js/AuthSession";
import { Mutex } from "upload-js/Mutex";
import { FileLike } from "upload-js/FileLike";
import { ProgressSmoother } from "progress-smoother";
import { UploadApiError } from "upload-js/UploadApiError";
import { UploadInterface } from "upload-js/UploadInterface";
import { UrlParams } from "upload-js/UrlParams";

type AddCancellationHandler = (cancellationHandler: () => void) => void;

const accountIdLength = 7; // Sync with: upload/shared/**/AccountIdUtils
const specialApiKeyAccountId = "W142hJk";
const specialApiKeys = ["free", "demo"];
const apiKeyPrefix = "public_";
const maxUploadConcurrency = 5;
const refreshBeforeExpirySeconds = 20;
const onProgressInterval = 100;
const retryAuthAfterErrorSeconds = 5;
const minJwtTtlSeconds = 10;
const accessTokenPathBase = "/api/v1/access_tokens/";
const logPrefix = "[upload-js] ";

/**
 * You should instantiate one instance of this class in your web app.
 *
 * Try using:
 *
 *    Upload({apiKey: "free"})
 *
 * If multiple instances exist, then all '*AuthSession' calls will be forwarded to the first instance that had an
 * '*AuthSession' call invoked on it.
 */
export function Upload(config: UploadConfig): UploadInterface {
  // ----------------
  // READONLY MEMBERS
  // ----------------

  let accountId: AccountId;
  const authMutex = Mutex();
  const apiUrl = config.internal?.apiUrl ?? "https://api.upload.io";
  const cdnUrl = config.internal?.cdnUrl ?? "https://upcdn.io";
  const authenticateWithApiKey = config.internal?.authenticateWithApiKey ?? true;
  const headers = config.internal?.headers;
  const debugMode = config.debug === true;

  // ------------------
  // READ/WRITE MEMBERS
  // ------------------

  let lastAuthSession: AuthSession | undefined;

  // ----------------
  // CONSTRUCTOR
  // ----------------

  if ((config ?? undefined) === undefined) {
    throw new Error(`${logPrefix}Config parameter required.`);
  }

  if (config.debug === true) {
    console.log(`${logPrefix}Initialized with API key '${config.apiKey}'`);
  }

  if ((config.apiKey ?? undefined) === undefined) {
    throw new Error(`${logPrefix}Please provide an API key via the 'apiKey' config parameter.`);
  }

  if (config.apiKey.trim() !== config.apiKey) {
    // We do not support API keys with whitespace (by trimming ourselves) because otherwise we'd need to support this
    // everywhere in perpetuity (since removing the trimming would be a breaking change).
    throw new Error(`${logPrefix}API key needs trimming (whitespace detected).`);
  }

  // Non-api-key authentication is required by Upload Dashboard, which uses bearer tokens instead of API keys because
  // the user may not have any active API keys, but might still want to upload files via the Upload Dashboard.
  if (config.internal?.authenticateWithApiKey === false) {
    accountId = config.internal.accountId;
  } else {
    if (specialApiKeys.includes(config.apiKey)) {
      accountId = specialApiKeyAccountId;
    } else {
      if (!config.apiKey.startsWith(apiKeyPrefix)) {
        throw new Error(`${logPrefix}API key must begin with "${apiKeyPrefix}".`);
      }

      accountId = config.apiKey.substr(apiKeyPrefix.length, accountIdLength);

      if (accountId.length !== accountIdLength) {
        throw new Error(`${logPrefix}API key is too short!`);
      }
    }
  }

  const accessTokenUrl = `${cdnUrl}${accessTokenPathBase}${accountId}`;

  // ----------------
  // PUBLIC METHODS
  // ----------------

  const beginAuthSession = async (
    authUrl: string,
    authHeaders: () => Promise<Record<string, string>>
  ): Promise<void> => {
    await callAuthMethod(
      async x => await x.beginAuthSession(authUrl, authHeaders),
      async () => {
        debug("User code called 'beginAuthSession'");

        // Explanation:
        // - Prevents restarting the auth session on accidental double-calls to 'beginAuthSession': in some users' code,
        //   this happens accidentally every second, so we want to bail-out if we detect this is occurring.
        // - We only check 'authUrl' to determine if the 'same call' is being made, since 'authHeaders' is a function
        //   and therefore its body can be switched-out by the user's code if they desire a change to its behaviour, so
        //   don't need to call 'beginAuthSession' just to update it.
        if (lastAuthSession?.authUrl === authUrl) {
          error(
            "'beginAuthSession' has already been called. Ignoring this call. (Hint: call 'endAuthSession' and then 'beginAuthSession' if you want to restart the auth session.)"
          );
          return;
        }

        await doEndAuthSession();

        const authSession: AuthSession = {
          accessToken: undefined,
          accessTokenRefreshHandle: undefined,
          isActive: true,
          authUrl
        };

        // Does not need to be inside the mutex since the environment is single-threaded, and we have not async-yielded
        // since the mutex from 'endAuthSession' was relinquished (meaning we still have execution, so we know a) nothing
        // can interject and b) nothing has interjected since the lock was relinquished).
        lastAuthSession = authSession;

        await refreshAccessToken(authUrl, authHeaders, authSession);
      }
    );
  };

  const endAuthSession = async (): Promise<void> => {
    await callAuthMethod(
      async x => await x.endAuthSession(),
      async () => {
        debug("User code called 'endAuthSession'");
        await doEndAuthSession();
      }
    );
  };

  const uploadFile = async (file: FileLike, params: UploadParams = {}): Promise<UploadedFile> => {
    debug("User code called 'uploadFile'");

    // Initial progress (raised immediately and synchronously).
    const cancellationHandlers: Array<() => void> = [];
    const addCancellationHandler: AddCancellationHandler = (ca: () => void): void => {
      cancellationHandlers.push(ca);
    };
    const cancel = (): void => cancellationHandlers.forEach(x => x());

    if (params.onBegin !== undefined) {
      params.onBegin({ cancel });
    }

    try {
      return await beginFileUpload(file, params, addCancellationHandler);
    } catch (e) {
      cancel();
      throw e;
    }
  };

  const url = (filePath: string, slugOrParams?: string | UrlParams): string => {
    const defaultSlug = "raw";
    const params: UrlParams | undefined =
      typeof slugOrParams === "string"
        ? {
            transformation: slugOrParams
          }
        : slugOrParams;

    return `${cdnUrl}/${accountId}/${params?.transformation ?? defaultSlug}${filePath}${
      params?.auth === true ? "?_auth=true" : ""
    }`;
  };

  const self: UploadInterface = {
    beginAuthSession,
    endAuthSession,
    uploadFile,
    url
  };

  // ----------------
  // PRIVATE METHODS
  // ----------------

  const doEndAuthSession = async (): Promise<void> => {
    await authMutex.safe(async () => {
      if (lastAuthSession === undefined) {
        return;
      }

      const authSession = lastAuthSession;

      lastAuthSession = undefined;

      if (authSession.accessTokenRefreshHandle !== undefined) {
        clearTimeout(authSession.accessTokenRefreshHandle);
      }

      authSession.isActive = false;

      await deleteAccessToken();
    });
  };

  const beginFileUpload = async (
    file: FileLike,
    params: UploadParams,
    addCancellationHandler: AddCancellationHandler
  ): Promise<UploadedFile> => {
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

    return await withProgressReporting(onProgressInterval, reportProgress, async () => {
      const uploadRequest: BeginUploadRequestV2 = {
        path: params.path,
        metadata: params.metadata,
        mime: normalizeMimeType(file.type),
        originalFileName: file.name,
        protocol: "1.1",
        size: file.size,
        tags: params.tags
      };

      debug(`Initiating file upload. Params = ${JSON.stringify(uploadRequest)}`);

      const uploadMetadata = handleApiResult(await beginMultipartUpload(getConfig(), accountId, uploadRequest));

      debug(`Initiated file upload. Metadata = ${JSON.stringify(uploadMetadata)}`);

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
      const getNextPart: (workerIndex: number) => Promise<UploadPartV2 | undefined> = async workerIndex => {
        const nextPart = nextPartQueue.pop();
        if (nextPart !== undefined) {
          debug(`Dequeued part ${nextPart.uploadPartIndex}.`, workerIndex);
          return nextPart;
        }
        const uploadPartIndex = incUploadIndex();
        if (uploadPartIndex === undefined) {
          debug("No parts remaining.", workerIndex);
          return undefined;
        }
        debug(`Fetching metadata for part ${uploadPartIndex}.`, workerIndex);
        return handleApiResult(await getUploadPart(getConfig(), accountId, uploadMetadata.uploadId, uploadPartIndex));
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
          await uploadPart(file, nextPart, progress, addCancellationHandler, workerIndex);
          await uploadNextPart(workerIndex);
        }
      };

      await Promise.all(
        [...Array(maxUploadConcurrency).keys()].map(async workerIndex => await uploadNextPart(workerIndex))
      );

      const uploadedFile: UploadedFile = {
        accountId,
        file,
        ...uploadMetadata.file
      };

      debug("File upload completed.");

      return uploadedFile;
    });
  };

  const putUploadPart = async (
    url: string,
    content: Blob,
    progress: (status: { bytesSent: number; bytesTotal: number }) => void,
    addCancellationHandler: AddCancellationHandler
  ): Promise<{ etag: string }> => {
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

        xhr.onabort = () => reject(new Error("File upload cancelled."));
        xhr.onerror = () => reject(new Error("File upload error."));
        xhr.ontimeout = () => reject(new Error("File upload timeout."));

        xhr.open("PUT", url);
        xhr.send(content);
      });
    } finally {
      pending = false;
    }
  };

  const uploadPart = async (
    file: FileLike,
    part: UploadPartV2,
    progress: (status: { bytesSent: number; bytesTotal: number }) => void,
    addCancellationHandler: AddCancellationHandler,
    workerIndex: number
  ): Promise<void> => {
    const content: Blob =
      part.range.inclusiveEnd === -1 ? new Blob() : file.slice(part.range.inclusiveStart, part.range.inclusiveEnd + 1);

    debug(`Uploading part ${part.uploadPartIndex}.`, workerIndex);

    const { etag } = await putUploadPart(part.uploadUrl, content, progress, addCancellationHandler);

    handleApiResult(
      await completeUploadPart(getConfig(), accountId, part.uploadId, part.uploadPartIndex, {
        etag
      })
    );

    debug(`Uploaded part ${part.uploadPartIndex}.`, workerIndex);
  };

  const withProgressReporting = async <T>(
    tickInterval: number,
    tick: (stopTicking: () => void) => void,
    scope: () => Promise<T>
  ): Promise<T> => {
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
  };

  const deleteAccessToken = async (): Promise<void> => {
    await deleteNoResponse(
      accessTokenUrl,
      {},
      true // Required, else CDN response's `Set-Cookie` header will be silently ignored.
    );
  };

  /**
   * Calls the given auth method on the canonical auth instance.
   */
  const callAuthMethod = async (
    other: (instance: UploadInterface) => Promise<void>,
    me: () => Promise<void>
  ): Promise<void> => {
    const authInstance = getAuthInstance();
    if (authInstance !== self) {
      // Forward call to global auth instance.
      await other(authInstance);
    } else {
      await me();
    }
  };

  /**
   * Returns a single global instance of Upload.js for all auth calls.
   * If we require multiple instances in the future, we can provide a parameter to disable this behaviour.
   */
  const getAuthInstance = (): UploadInterface => {
    const globalKey = "uploadJsAuthInstance";
    let globalAuthInstance = (window as any)[globalKey] as UploadInterface | undefined;

    if (globalAuthInstance === undefined) {
      globalAuthInstance = self;
      (window as any)[globalKey] = self;
    }

    return globalAuthInstance;
  };

  const refreshAccessToken = async (
    authUrl: string,
    authHeaders: () => Promise<Record<string, string>>,
    authSession: AuthSession
  ): Promise<void> => {
    try {
      await authMutex.safe(async () => {
        // Session may have been ended while timer was waiting.
        if (!authSession.isActive) {
          return;
        }

        const token = await getAccessToken(authUrl, await authHeaders());
        const setTokenResult = await putJsonGetJson<SetAccessTokenResponseDto, SetAccessTokenRequestDto>(
          accessTokenUrl,
          {},
          {
            accessToken: token
          },
          true // Required, else CDN response's `Set-Cookie` header will be silently ignored.
        );

        const desiredTtlSeconds = setTokenResult.ttlSeconds - refreshBeforeExpirySeconds;

        if (desiredTtlSeconds < minJwtTtlSeconds) {
          warn(`JWT expiration is too short: waiting for ${minJwtTtlSeconds} seconds before refreshing.`);
        }

        authSession.accessToken = setTokenResult.accessToken;
        authSession.accessTokenRefreshHandle = window.setTimeout(() => {
          refreshAccessToken(authUrl, authHeaders, authSession).then(
            () => {},
            e => error(`Permanent error when refreshing access token: ${e as string}`)
          );
        }, Math.max(minJwtTtlSeconds, desiredTtlSeconds) * 1000);
      });
    } catch (e) {
      // Use 'error' instead of 'debug' so that the user sees error messages.
      error(`Error when refreshing access token: ${e as string}`);

      // Perform attempts as part of same promise, rather than via a 'setTimeout' so that the 'beginAuthSession' only
      // returns once an auth session has been successfully established.
      await new Promise(resolve => setTimeout(resolve, retryAuthAfterErrorSeconds * 1000));

      // Todo: is this stack safe?
      await refreshAccessToken(authUrl, authHeaders, authSession);
    }
  };

  const putJsonGetJson = async <TGet, TPost>(
    url: string,
    headers: Record<string, string>,
    requestBody: TPost,
    withCredentials: boolean
  ): Promise<TGet> => {
    return await handleApiResult(
      await nonUploadApiRequest(
        {
          method: "PUT",
          path: url,
          headers,
          body: requestBody
        },
        withCredentials
      )
    );
  };

  const getAccessToken = async (authUrl: string, headers: Record<string, string>): Promise<string> => {
    const endpointName = "Your auth API endpoint";

    const result = await nonUploadApiRequest<unknown>(
      {
        method: "GET",
        path: authUrl,
        headers
      },
      false
    );

    if (!result.ok) {
      throw new Error(
        `${logPrefix}${endpointName} returned a failed response. Please ensure the endpoint's status code is 200.`
      );
    }

    const jwt = result.body;

    if (typeof jwt !== "string") {
      // We will receive 'null' if there was no content-type response header.
      throw new Error(
        `${logPrefix}${endpointName} returned an unsupported response. Please ensure: 1) 'Content-Type: text/plain' is in the HTTP response headers 2) the status code is 200.`
      );
    }

    if (jwt.length === 0) {
      throw new Error(`${logPrefix}${endpointName} returned an empty string. Please return a valid JWT instead.`);
    }

    if (jwt.trim().length !== jwt.length) {
      // Whitespace can be a nightmare to spot/debug, so we fail early here.
      throw new Error(`${logPrefix}${endpointName} returned whitespace around the JWT, please remove it.`);
    }

    return jwt;
  };

  const deleteNoResponse = async (
    url: string,
    headers: Record<string, string>,
    withCredentials: boolean
  ): Promise<void> => {
    handleApiResult(
      await nonUploadApiRequest(
        {
          method: "DELETE",
          path: url,
          headers
        },
        withCredentials
      )
    );
  };

  const handleApiResult = <T>(result: ApiResult<T>): T => {
    if (result.ok) {
      return result.body;
    }

    const errorResponseMaybe = result.body;
    if (typeof errorResponseMaybe?.error?.code === "string") {
      throw new UploadApiError(errorResponseMaybe as ErrorResponse);
    }

    throw new Error(`${logPrefix}Unexpected API error.`);
  };

  const nonUploadApiRequest = async <T>(
    options: ApiRequestOptions,
    withCredentials: boolean
  ): Promise<ApiResult<T>> => {
    return await request<T>(
      {
        BASE: options.path,
        WITH_CREDENTIALS: withCredentials
      },
      {
        ...options,
        path: "" // We set to "" because we're using "BASE" above instead.
      }
    );
  };

  const getConfig = (): Config => {
    const apiConfig: Config = {
      BASE: apiUrl,
      WITH_CREDENTIALS: true
    };

    if (authenticateWithApiKey) {
      apiConfig.USERNAME = "apikey";
      apiConfig.PASSWORD = config.apiKey;
    }

    const accessToken = lastAuthSession?.accessToken;

    if (headers !== undefined || accessToken !== undefined) {
      apiConfig.HEADERS = async (): Promise<Record<string, string>> => {
        const headersFromConfig = headers === undefined ? {} : await headers();
        const accessToken = lastAuthSession?.accessToken; // Re-fetch as there's been an async boundary so state may have changed.
        return {
          ...headersFromConfig,
          ...(accessToken === undefined
            ? {}
            : {
                "authorization-token": accessToken
              })
        };
      };
    }

    return apiConfig;
  };

  const normalizeMimeType = (mime: string): string | undefined => {
    const normal = mime.toLowerCase();
    const regex = /^[a-z0-9]+\/[a-z0-9+\-._]+(?:;[^=]+=[^;]+)*$/; // Sync with 'MimeTypeUnboxed' in 'upload/api'.
    return regex.test(normal) ? normal : undefined;
  };

  const debug = (message: string, workerIndex?: number): void => {
    if (debugMode) {
      console.log(`${logPrefix}${message}${workerIndex !== undefined ? ` (Worker ${workerIndex})` : ""}`);
    }
  };

  const error = (message: string): void => {
    console.error(`${logPrefix}${message}`);
  };

  const warn = (message: string): void => {
    console.warn(`${logPrefix}${message}`);
  };

  return self;
}
