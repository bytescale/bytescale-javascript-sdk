import { jest } from "@jest/globals";
import { Response as NodeFetchResponse } from "node-fetch";
import type { AuthSwConfigEntryDto, BeginAuthSessionParamsV1, BeginAuthSessionParamsV2 } from "../src/index.browser";

interface AuthManagerApi {
  beginAuthSession: (params: BeginAuthSessionParamsV1 | BeginAuthSessionParamsV2) => Promise<void>;
  endAuthSession: () => Promise<void>;
  isAuthSessionActive: () => boolean;
  isAuthSessionReady: () => boolean;
}

describe("AuthManager browser service-worker config", () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const globalFetch = jest.fn(async (): Promise<Response> => {
    throw new Error("This test must not use the global fetch API.");
  });
  const postMessage = jest.fn((_message: unknown): void => {});
  const activeWorker = { postMessage, state: "activated" } as unknown as ServiceWorker;
  const registration = {
    active: activeWorker,
    installing: null,
    scope: "https://app.example.com/",
    waiting: null
  } as unknown as ServiceWorkerRegistration;
  const serviceWorkerApi = {
    controller: activeWorker,
    getRegistrations: jest.fn(async (): Promise<ServiceWorkerRegistration[]> => [registration]),
    register: jest.fn(async (): Promise<ServiceWorkerRegistration> => registration)
  };
  const navigatorValue: { serviceWorker?: typeof serviceWorkerApi } = { serviceWorker: serviceWorkerApi };
  let AuthManager: AuthManagerApi;

  beforeAll(async () => {
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: globalFetch });
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: navigatorValue });
    AuthManager = (await import("../src/public/browser/AuthManagerBrowser")).AuthManager;
  });

  beforeEach(() => {
    navigatorValue.serviceWorker = serviceWorkerApi;
    globalFetch.mockClear();
    postMessage.mockClear();
    serviceWorkerApi.getRegistrations.mockClear();
    serviceWorkerApi.register.mockClear();
  });

  afterAll(() => {
    for (const [key, descriptor] of [
      ["fetch", originalFetch],
      ["navigator", originalNavigator],
      ["window", originalWindow]
    ] as const) {
      if (descriptor === undefined) {
        Reflect.deleteProperty(globalThis, key);
      } else {
        Object.defineProperty(globalThis, key, descriptor);
      }
    }
  });

  afterEach(async () => {
    navigatorValue.serviceWorker = serviceWorkerApi;
    await AuthManager.endAuthSession();
    jest.restoreAllMocks();
  });

  test("V2 applies multiple entries and refreshes before the earliest expiry", async () => {
    const firstConfig: AuthSwConfigEntryDto[] = [
      {
        expires: Date.now() + 21_000,
        headers: [{ key: "Authorization", value: "Bearer account-a" }],
        sourceUrlPrefixes: ["https://app.example.com/account-a/"],
        urlPrefix: "https://upcdn.io/account-a/"
      },
      {
        expires: Date.now() + 60_000,
        headers: [{ key: "Authorization", value: "Bearer account-b" }],
        urlPrefix: "https://upcdn.io/account-b/"
      }
    ];
    const refreshedConfig: AuthSwConfigEntryDto[] = [
      {
        expires: undefined,
        headers: [{ key: "Authorization", value: "Bearer refreshed" }],
        urlPrefix: "https://upcdn.io/account-a/"
      }
    ];
    const getServiceWorkerConfig = jest
      .fn<BeginAuthSessionParamsV2["getServiceWorkerConfig"]>()
      .mockResolvedValueOnce(firstConfig)
      .mockResolvedValueOnce(refreshedConfig);

    await AuthManager.beginAuthSession({
      getServiceWorkerConfig,
      serviceWorkerScript: "/bytescale-auth-sw.js"
    });

    expect(AuthManager.isAuthSessionActive()).toBe(true);
    expect(AuthManager.isAuthSessionReady()).toBe(true);
    expect(postMessage.mock.calls[0][0]).toEqual({
      config: [
        {
          ...firstConfig[0],
          urlPrefix: "!bytescale-source-scoped!https://upcdn.io/account-a/"
        },
        firstConfig[1]
      ],
      type: "SET_BYTESCALE_AUTH_CONFIG"
    });
    expect(firstConfig[0].urlPrefix).toBe("https://upcdn.io/account-a/");

    await new Promise(resolve => setTimeout(resolve, 1_500));

    expect(getServiceWorkerConfig).toHaveBeenCalledTimes(2);
    expect(postMessage.mock.calls[1][0]).toEqual({
      config: refreshedConfig,
      type: "SET_BYTESCALE_AUTH_CONFIG"
    });
  });

  test("V2 clears service-worker config without calling access-token endpoints", async () => {
    await AuthManager.beginAuthSession({
      getServiceWorkerConfig: async () => [
        {
          expires: undefined,
          headers: [{ key: "Authorization", value: "Bearer account-a" }],
          urlPrefix: "https://upcdn.io/account-a/"
        }
      ],
      serviceWorkerScript: "/bytescale-auth-sw.js"
    });
    await AuthManager.endAuthSession();

    expect(globalFetch).not.toHaveBeenCalled();
    expect(postMessage.mock.calls[1][0]).toEqual({ config: [], type: "SET_BYTESCALE_AUTH_CONFIG" });
    expect(AuthManager.isAuthSessionActive()).toBe(false);
    expect(AuthManager.isAuthSessionReady()).toBe(false);
  });

  test("V2 rejects instead of falling back to cookies when service workers are unavailable", async () => {
    delete navigatorValue.serviceWorker;
    const getServiceWorkerConfig = jest.fn(async (): Promise<AuthSwConfigEntryDto[]> => []);

    await expect(
      AuthManager.beginAuthSession({ getServiceWorkerConfig, serviceWorkerScript: "/bytescale-auth-sw.js" })
    ).rejects.toThrow("requires service workers");

    expect(getServiceWorkerConfig).not.toHaveBeenCalled();
    expect(AuthManager.isAuthSessionActive()).toBe(false);
  });

  test("V1 retains cookie fallback when service workers are unavailable", async () => {
    delete navigatorValue.serviceWorker;
    const fetchApi = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      switch (init?.method) {
        case "GET":
          return new NodeFetchResponse("jwt-a", {
            headers: { "Content-Type": "text/plain" }
          }) as unknown as Response;
        case "PUT":
          return new NodeFetchResponse(
            JSON.stringify({ accessToken: "access-a", ttlSeconds: 3600 })
          ) as unknown as Response;
        case "DELETE":
          return new NodeFetchResponse(null, { status: 204 }) as unknown as Response;
        default:
          throw new Error(`Unexpected method: ${init?.method ?? "undefined"}`);
      }
    });

    await AuthManager.beginAuthSession({
      accountId: "account-a",
      authHeaders: async (): Promise<Record<string, string>> => ({}),
      authUrl: "https://app.example.com/auth",
      options: { fetchApi },
      serviceWorkerScript: "/bytescale-auth-sw.js"
    });

    expect((fetchApi.mock.calls[1][0] as string).endsWith("?set-cookie=true")).toBe(true);
    expect(postMessage).not.toHaveBeenCalled();
    expect(AuthManager.isAuthSessionReady()).toBe(true);
  });

  test("V1 retains the existing JWT, access-token, and single-entry service-worker flow", async () => {
    const fetchApi = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      switch (init?.method) {
        case "GET":
          return new NodeFetchResponse("jwt-a", {
            headers: { "Content-Type": "text/plain" }
          }) as unknown as Response;
        case "PUT":
          return new NodeFetchResponse(
            JSON.stringify({ accessToken: "access-a", ttlSeconds: 3600 })
          ) as unknown as Response;
        case "DELETE":
          return new NodeFetchResponse(null, { status: 204 }) as unknown as Response;
        default:
          throw new Error(`Unexpected method: ${init?.method ?? "undefined"}`);
      }
    });
    const params: BeginAuthSessionParamsV1 = {
      accountId: "account-a",
      authHeaders: async (): Promise<Record<string, string>> => ({ "X-App-Authorization": "app-token" }),
      authUrl: "https://app.example.com/auth",
      options: { fetchApi },
      serviceWorkerScript: "/bytescale-auth-sw.js",
      sourceUrlPrefixes: ["https://app.example.com/"]
    };

    await AuthManager.beginAuthSession(params);

    expect(AuthManager.isAuthSessionReady()).toBe(true);
    expect(postMessage.mock.calls[0][0]).toEqual({
      config: [
        {
          expires: expect.any(Number),
          headers: [{ key: "Authorization", value: "Bearer jwt-a" }],
          sourceUrlPrefixes: params.sourceUrlPrefixes,
          urlPrefix: "!bytescale-source-scoped!https://upcdn.io/account-a/"
        }
      ],
      type: "SET_BYTESCALE_AUTH_CONFIG"
    });
    expect(fetchApi.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "PUT"]);

    await AuthManager.endAuthSession();

    expect(fetchApi.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "PUT", "DELETE"]);
    expect(postMessage.mock.calls[1][0]).toEqual({ config: [], type: "SET_BYTESCALE_AUTH_CONFIG" });
  });
});
