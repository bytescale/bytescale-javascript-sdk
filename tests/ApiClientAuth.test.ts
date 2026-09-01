import { jest } from "@jest/globals";
import { Headers as NodeFetchHeaders, Response as NodeFetchResponse } from "node-fetch";
import { AuthSessionState } from "../src/private/AuthSessionState";
import { AuthSession, AuthSessionConfigState } from "../src/private/model/AuthSession";
import { AuthSessionConfig, BeginAuthSessionParams } from "../src/private/model/AuthManagerInterface";
import { BaseAPI, BytescaleApiClientConfig, FetchAPI, RequestOpts } from "../src/public/shared/generated/runtime";

const accountA = "A123abc";
const accountB = "B123abc";
const apiKeyA = `public_${accountA}_test`;

class TestApi extends BaseAPI {
  async get(): Promise<Response> {
    const request: RequestOpts = { headers: {}, method: "GET", path: "/test" };
    return await this.request(request, undefined, undefined);
  }
}

describe("API-client AuthManager configuration", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  beforeAll(() => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  });

  afterEach(() => {
    AuthSessionState.setSession(undefined);
  });

  afterAll(() => {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", originalWindow);
    }
  });

  test("retains API-key-only authentication when no default AuthManager config exists", async () => {
    setModernSession([state("named", accountA, "jwt-a", "access-a")]);
    const { api, fetchApi } = createApi({ apiKey: apiKeyA });

    await api.get();

    expect(requestHeaders(fetchApi).get("Authorization")).toBe(`Bearer ${apiKeyA}`);
    expect(requestHeaders(fetchApi).has("Authorization-Token")).toBe(false);
  });

  test("supplements an API key with the selected registered access token on every request", async () => {
    const defaultState = state(undefined, accountA, "jwt-a", "access-a");
    setModernSession([defaultState]);
    const { api, fetchApi } = createApi({ apiKey: apiKeyA });

    await api.get();
    defaultState.accessToken = "access-refreshed";
    await api.get();

    expect(requestHeaders(fetchApi, 0).get("Authorization")).toBe(`Bearer ${apiKeyA}`);
    expect(requestHeaders(fetchApi, 0).get("Authorization-Token")).toBe("access-a");
    expect(requestHeaders(fetchApi, 1).get("Authorization-Token")).toBe("access-refreshed");
  });

  test("uses the raw JWT as sole authentication for an API-key-less named client", async () => {
    setModernSession([state("customer", accountB, "jwt-b", "access-b")]);
    const { api, fetchApi } = createApi({ authConfigId: "customer" });

    await api.get();

    expect(requestHeaders(fetchApi).get("Authorization")).toBe("Bearer jwt-b");
    expect(requestHeaders(fetchApi).has("Authorization-Token")).toBe(false);
  });

  test("supports an API-key-less default client", async () => {
    setModernSession([state(undefined, accountA, "jwt-a", "access-a")]);
    const { api, fetchApi } = createApi({});

    await api.get();

    expect(requestHeaders(fetchApi).get("Authorization")).toBe("Bearer jwt-a");
  });

  test("fails clearly for opt-out without an API key and for an unknown named config", async () => {
    setModernSession([state(undefined, accountA, "jwt-a", "access-a")]);

    await expect(createApi({ authConfigId: false }).api.get()).rejects.toThrow("provide an API key");
    await expect(createApi({ apiKey: apiKeyA, authConfigId: "missing" }).api.get()).rejects.toThrow(
      "No active AuthManager configuration has ID 'missing'"
    );
  });

  test("fails before fetch when API-key and AuthManager accounts differ", async () => {
    setModernSession([state(undefined, accountB, "jwt-b", "access-b")]);
    const { api, fetchApi } = createApi({ apiKey: apiKeyA });

    await expect(api.get()).rejects.toThrow("belongs to account");
    expect(fetchApi).not.toHaveBeenCalled();
  });

  test("allows construction before an API-key-less AuthManager config becomes available", async () => {
    const { api, fetchApi } = createApi({ authConfigId: "later" });
    await expect(api.get()).rejects.toThrow("No active AuthManager configuration");

    setModernSession([state("later", accountA, "jwt-a", "access-a")]);
    await api.get();

    expect(requestHeaders(fetchApi).get("Authorization")).toBe("Bearer jwt-a");
  });

  test("fails closed for an expired selected configuration", async () => {
    const expired = state("expired", accountA, "jwt-a", "access-a");
    expired.expiresAt = Date.now() - 1;
    setModernSession([expired]);

    await expect(createApi({ apiKey: apiKeyA, authConfigId: "expired" }).api.get()).rejects.toThrow("not ready");
    await expect(createApi({ authConfigId: "expired" }).api.get()).rejects.toThrow("not ready");
  });

  test("fails closed for an expired V2 default unless AuthManager is explicitly disabled", async () => {
    const expired = state(undefined, accountA, "jwt-a", "access-a");
    expired.expiresAt = Date.now() - 1;
    setModernSession([expired]);

    await expect(createApi({ apiKey: apiKeyA }).api.get()).rejects.toThrow("not ready");
    const optedOut = createApi({ apiKey: apiKeyA, authConfigId: false });
    await optedOut.api.get();
    expect(requestHeaders(optedOut.fetchApi).get("Authorization")).toBe(`Bearer ${apiKeyA}`);
  });

  test("recognizes a 3.54 session as the default supplemental token", async () => {
    AuthSessionState.setSession({
      accessToken: "legacy-access",
      accessTokenRefreshHandle: undefined,
      authServiceWorker: undefined,
      isActive: true,
      params: {
        accountId: accountA,
        authHeaders: async (): Promise<Record<string, string>> => ({}),
        authUrl: "https://app.example.com/auth"
      }
    });
    const withKey = createApi({ apiKey: apiKeyA });

    await withKey.api.get();

    expect(requestHeaders(withKey.fetchApi).get("Authorization-Token")).toBe("legacy-access");
    await expect(createApi({}).api.get()).rejects.toThrow("provide an API key");
  });

  test("retains deterministic custom authentication-header precedence", async () => {
    setModernSession([state(undefined, accountA, "jwt-a", "access-a")]);
    const { api, fetchApi } = createApi({
      apiKey: apiKeyA,
      headers: async (): Promise<Record<string, string>> => ({
        "authorization": "Custom authorization",
        "AUTHORIZATION-TOKEN": "custom-token"
      })
    });

    await api.get();

    const headers = requestHeaders(fetchApi);
    expect(headers.get("Authorization")).toBe("Custom authorization");
    expect(headers.get("Authorization-Token")).toBe("custom-token");
    expect(headers.has("authConfigId")).toBe(false);
  });
});

function createApi(config: Omit<BytescaleApiClientConfig, "fetchApi">): {
  api: TestApi;
  fetchApi: jest.MockedFunction<FetchAPI>;
} {
  const fetchApi = jest.fn<FetchAPI>(async () => new NodeFetchResponse("{}") as unknown as Response);
  return { api: new TestApi({ ...config, fetchApi }), fetchApi };
}

function requestHeaders(
  fetchApi: jest.MockedFunction<FetchAPI>,
  call = fetchApi.mock.calls.length - 1
): NodeFetchHeaders {
  return new NodeFetchHeaders(fetchApi.mock.calls[call][1]?.headers as Record<string, string>);
}

function state(
  authConfigId: string | undefined,
  accountId: string,
  jwt: string,
  accessToken: string
): AuthSessionConfigState {
  const config: AuthSessionConfig = {
    accountId,
    authConfigId,
    enableServiceWorkerAuth: false,
    getAuthorizationToken: async () => jwt
  };
  return {
    accessToken,
    config,
    expiresAt: Date.now() + 60_000,
    jwt,
    refreshHandle: undefined
  };
}

function setModernSession(states: AuthSessionConfigState[]): void {
  const configs = states.map(value => value.config);
  const nonEmptyConfigs: [AuthSessionConfig, ...AuthSessionConfig[]] = [configs[0], ...configs.slice(1)];
  const params: BeginAuthSessionParams = {
    authConfigs: async () => nonEmptyConfigs,
    serviceWorkerScript: undefined
  };
  const session: AuthSession = {
    accessToken: undefined,
    accessTokenRefreshHandle: undefined,
    authConfigs: states,
    authServiceWorker: undefined,
    isActive: true,
    isReady: true,
    params,
    serviceWorkerConfigured: false
  };
  AuthSessionState.setSession(session);
}
