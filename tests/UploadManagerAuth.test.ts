import { jest } from "@jest/globals";
import { AuthSessionState } from "../src/private/AuthSessionState";
import { UploadManagerBase } from "../src/private/UploadManagerBase";
import { AddCancellationHandler } from "../src/private/model/AddCancellationHandler";
import { AuthSessionConfigState } from "../src/private/model/AuthSession";
import { OnPartProgress } from "../src/private/model/OnPartProgress";
import { PreUploadInfo } from "../src/private/model/PreUploadInfo";
import { PutUploadPartResult } from "../src/private/model/PutUploadPartResult";
import { UploadManagerParams, UploadSource } from "../src/public/shared/CommonTypes";
import {
  BeginMultipartUploadResponse,
  CompleteMultipartUploadResponse,
  UploadPart
} from "../src/public/shared/generated";

const accountA = "A123abc";

class TestUploadManager extends UploadManagerBase<string, undefined> {
  protected processUploadSource(data: UploadSource): string {
    return String(data);
  }

  protected getPreUploadInfoPartial(
    _request: UploadManagerParams,
    _source: string
  ): Partial<PreUploadInfo> & { size: number } {
    return { size: 1 };
  }

  protected preUpload(_source: string): undefined {
    return undefined;
  }

  protected async postUpload(_init: undefined): Promise<void> {}

  protected async doPutUploadPart(
    _part: UploadPart,
    _contentLength: number,
    _source: string,
    _onProgress: OnPartProgress,
    _addCancellationHandler: AddCancellationHandler
  ): Promise<PutUploadPartResult> {
    return { etag: "etag", status: 200 };
  }
}

describe("UploadManager AuthManager configuration", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  beforeAll(() => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  });

  afterEach(() => AuthSessionState.setSession(undefined));

  afterAll(() => {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", originalWindow);
    }
  });

  test("allows keyless construction and resolves the selected account once upload begins", async () => {
    const manager = new TestUploadManager({ authConfigId: "customer" });
    await expect(manager.upload({ data: "x" })).rejects.toThrow("No active AuthManager configuration");

    setSession(state("customer", accountA));
    const uploadApi = installUploadApiMock(manager);
    await manager.upload({ data: "x" });

    expect(uploadApi.beginMultipartUpload).toHaveBeenCalledWith(expect.objectContaining({ accountId: accountA }));
    expect(uploadApi.completeUploadPart).toHaveBeenCalledWith(expect.objectContaining({ accountId: accountA }));
  });

  test("fails before upload network work when keyless AuthManager auth is explicitly disabled", async () => {
    const manager = new TestUploadManager({ authConfigId: false });
    const uploadApi = installUploadApiMock(manager);

    await expect(manager.upload({ data: "x" })).rejects.toThrow("provide an API key");
    expect(uploadApi.beginMultipartUpload).not.toHaveBeenCalled();
  });
});

interface UploadApiMock {
  beginMultipartUpload: jest.MockedFunction<(request: { accountId: string }) => Promise<BeginMultipartUploadResponse>>;
  completeUploadPart: jest.MockedFunction<(request: { accountId: string }) => Promise<CompleteMultipartUploadResponse>>;
  getUploadPart: jest.MockedFunction<(request: { accountId: string }) => Promise<UploadPart>>;
}

function installUploadApiMock(manager: TestUploadManager): UploadApiMock {
  const firstPart: UploadPart = {
    range: { inclusiveEnd: 0, inclusiveStart: 0 },
    uploadId: "upload-id",
    uploadPartIndex: 0,
    uploadUrl: "https://upload.example.com/part"
  };
  const beginResponse: BeginMultipartUploadResponse = {
    file: {
      accountId: accountA,
      etag: null,
      filePath: "/file.txt",
      fileUrl: `https://upcdn.io/${accountA}/raw/file.txt`,
      lastModified: { tYPE: "EpochMillis" },
      metadata: {},
      mime: "text/plain",
      originalFileName: null,
      size: 1,
      tags: []
    },
    uploadId: "upload-id",
    uploadParts: { count: 1, first: firstPart }
  };
  const uploadApi: UploadApiMock = {
    beginMultipartUpload: jest.fn<(request: { accountId: string }) => Promise<BeginMultipartUploadResponse>>(
      async _request => beginResponse
    ),
    completeUploadPart: jest.fn<(request: { accountId: string }) => Promise<CompleteMultipartUploadResponse>>(
      async (_request): Promise<CompleteMultipartUploadResponse> => ({ etag: "etag", status: "Completed" })
    ),
    getUploadPart: jest.fn<(request: { accountId: string }) => Promise<UploadPart>>(async _request => firstPart)
  };
  (manager as unknown as { uploadApi: UploadApiMock }).uploadApi = uploadApi;
  return uploadApi;
}

function state(authConfigId: string, accountId: string): AuthSessionConfigState {
  return {
    accessToken: "access-token",
    config: {
      accountId,
      authConfigId,
      enableServiceWorkerAuth: false,
      getAuthorizationToken: async () => "jwt"
    },
    expiresAt: Date.now() + 60_000,
    jwt: "jwt",
    refreshHandle: undefined
  };
}

function setSession(configState: AuthSessionConfigState): void {
  AuthSessionState.setSession({
    accessToken: undefined,
    accessTokenRefreshHandle: undefined,
    authConfigs: [configState],
    authServiceWorker: undefined,
    isActive: true,
    isReady: true,
    params: {
      authConfigs: async () => [configState.config],
      serviceWorkerScript: undefined
    },
    serviceWorkerConfigured: false
  });
}
