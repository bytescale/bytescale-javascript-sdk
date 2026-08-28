import { jest } from "@jest/globals";
import { Response as NodeFetchResponse } from "node-fetch";
import { AuthSessionState } from "../src/private/AuthSessionState";
import type {
  AuthManagerServiceWorkerConfig,
  AuthSwConfigEntryDto,
  BeginAuthSessionParams
} from "../src/index.browser";

type FetchApi = NonNullable<NonNullable<BeginAuthSessionParams["options"]>["fetchApi"]>;

interface AuthManagerApi {
  beginAuthSession: (params: BeginAuthSessionParams) => Promise<void>;
  endAuthSession: () => Promise<void>;
  isAuthSessionActive: () => boolean;
  isAuthSessionReady: () => boolean;
}

interface AuthManagerInternals extends AuthManagerApi {
  refreshAccessToken: (
    session: NonNullable<ReturnType<typeof AuthSessionState.getSession>>,
    params: BeginAuthSessionParams
  ) => Promise<void>;
  scheduler: { unschedule: (handle: number) => void };
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

  test("retains the existing cookie fallback when no additional config is requested", async () => {
    delete navigatorValue.serviceWorker;
    const fetchApi = createPrimaryFetchApi();

    await AuthManager.beginAuthSession(createParams(fetchApi));

    expect((fetchApi.mock.calls[1][0] as string).endsWith("?set-cookie=true")).toBe(true);
    expect(postMessage).not.toHaveBeenCalled();
    expect(AuthManager.isAuthSessionReady()).toBe(true);
  });

  test("retains the existing primary-only service-worker flow", async () => {
    const fetchApi = createPrimaryFetchApi();

    await AuthManager.beginAuthSession({
      ...createParams(fetchApi),
      serviceWorkerScript: "/bytescale-auth-sw.js"
    });

    expect(AuthManager.isAuthSessionReady()).toBe(true);
    expect(postMessage.mock.calls[0][0]).toEqual({
      config: [
        {
          expires: expect.any(Number),
          headers: [{ key: "Authorization", value: "Bearer jwt-a" }],
          urlPrefix: "https://upcdn.io/account-a/"
        }
      ],
      type: "SET_BYTESCALE_AUTH_CONFIG"
    });
    expect(fetchApi.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "PUT"]);
  });

  test("merges the primary API/download context with additional download-only contexts", async () => {
    const fetchApi = createPrimaryFetchApi();
    const additionalConfig: AuthSwConfigEntryDto[] = [
      {
        expires: Date.now() + 60_000,
        headers: [{ key: "Authorization", value: "Bearer jwt-b" }],
        sourceUrlPrefixes: ["https://app.example.com/account-b/"],
        urlPrefix: "https://upcdn.io/account-b/"
      },
      {
        expires: undefined,
        headers: [{ key: "Authorization", value: "Bearer jwt-c" }],
        urlPrefix: "https://upcdn.io/account-c/"
      }
    ];
    const serviceWorkerConfig = jest.fn(
      async (): Promise<AuthManagerServiceWorkerConfig> => ({
        additionalConfig,
        sourceUrlPrefixes: ["https://app.example.com/"]
      })
    );

    await AuthManager.beginAuthSession({
      ...createParams(fetchApi),
      serviceWorkerConfig,
      serviceWorkerScript: "/bytescale-auth-sw.js"
    });

    expect(AuthManager.isAuthSessionReady()).toBe(true);
    expect(serviceWorkerConfig).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls[0][0]).toEqual({
      config: [
        {
          expires: expect.any(Number),
          headers: [{ key: "Authorization", value: "Bearer jwt-a" }],
          sourceUrlPrefixes: ["https://app.example.com/"],
          urlPrefix: "!bytescale-source-scoped!https://upcdn.io/account-a/"
        },
        {
          ...additionalConfig[0],
          urlPrefix: "!bytescale-source-scoped!https://upcdn.io/account-b/"
        },
        additionalConfig[1]
      ],
      type: "SET_BYTESCALE_AUTH_CONFIG"
    });
    expect(additionalConfig[0].urlPrefix).toBe("https://upcdn.io/account-b/");
    expect(AuthSessionState.getSession()?.accessToken).toBe("access-a");
    expect(fetchApi.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "PUT"]);

    await AuthManager.endAuthSession();

    expect(fetchApi.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "PUT", "DELETE"]);
    expect(postMessage.mock.calls[1][0]).toEqual({ config: [], type: "SET_BYTESCALE_AUTH_CONFIG" });
  });

  test("refreshes additional rules independently while retaining the primary context", async () => {
    const fetchApi = createPrimaryFetchApi();
    const initialAdditionalConfig: AuthSwConfigEntryDto[] = [
      {
        expires: Date.now() + 21_000,
        headers: [{ key: "Authorization", value: "Bearer jwt-b" }],
        urlPrefix: "https://upcdn.io/account-b/"
      }
    ];
    const serviceWorkerConfig = jest
      .fn<() => Promise<AuthManagerServiceWorkerConfig>>()
      .mockResolvedValueOnce({
        additionalConfig: initialAdditionalConfig,
        sourceUrlPrefixes: ["https://app.example.com/initial/"]
      })
      .mockResolvedValueOnce({
        additionalConfig: [],
        sourceUrlPrefixes: ["https://app.example.com/refreshed/"]
      });

    await AuthManager.beginAuthSession({
      ...createParams(fetchApi),
      serviceWorkerConfig,
      serviceWorkerScript: "/bytescale-auth-sw.js"
    });
    await new Promise(resolve => setTimeout(resolve, 1_500));

    expect(serviceWorkerConfig).toHaveBeenCalledTimes(2);
    expect(postMessage.mock.calls[1][0]).toEqual({
      config: [
        {
          expires: expect.any(Number),
          headers: [{ key: "Authorization", value: "Bearer jwt-a" }],
          sourceUrlPrefixes: ["https://app.example.com/refreshed/"],
          urlPrefix: "!bytescale-source-scoped!https://upcdn.io/account-a/"
        }
      ],
      type: "SET_BYTESCALE_AUTH_CONFIG"
    });
    expect(fetchApi.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "PUT"]);
    expect(AuthManager.isAuthSessionReady()).toBe(true);
  });

  test("retains additional rules when the primary JWT refreshes", async () => {
    const fetchApi = createPrimaryFetchApi();
    const additionalConfig: AuthSwConfigEntryDto[] = [
      {
        expires: undefined,
        headers: [{ key: "Authorization", value: "Bearer jwt-b" }],
        urlPrefix: "https://upcdn.io/account-b/"
      }
    ];
    const serviceWorkerConfig = jest.fn(
      async (): Promise<AuthManagerServiceWorkerConfig> => ({
        additionalConfig
      })
    );

    await AuthManager.beginAuthSession({
      ...createParams(fetchApi),
      serviceWorkerConfig,
      serviceWorkerScript: "/bytescale-auth-sw.js"
    });

    const session = AuthSessionState.getSession();
    if (session?.accessTokenRefreshHandle === undefined) {
      throw new Error("Expected the primary access-token refresh to be scheduled.");
    }
    const authManagerInternals = AuthManager as AuthManagerInternals;
    authManagerInternals.scheduler.unschedule(session.accessTokenRefreshHandle);
    await authManagerInternals.refreshAccessToken(session, session.params);

    expect(serviceWorkerConfig).toHaveBeenCalledTimes(1);
    expect(fetchApi.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "PUT", "GET", "PUT"]);
    expect(postMessage.mock.calls[1][0]).toEqual({
      config: [
        {
          expires: expect.any(Number),
          headers: [{ key: "Authorization", value: "Bearer jwt-a" }],
          urlPrefix: "https://upcdn.io/account-a/"
        },
        additionalConfig[0]
      ],
      type: "SET_BYTESCALE_AUTH_CONFIG"
    });
  });

  test("fails closed until the initial service-worker config callback succeeds", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const fetchApi = createPrimaryFetchApi();

    await AuthManager.beginAuthSession({
      ...createParams(fetchApi),
      serviceWorkerConfig: async () => null as unknown as AuthManagerServiceWorkerConfig,
      serviceWorkerScript: "/bytescale-auth-sw.js"
    });

    expect(fetchApi.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "PUT"]);
    expect(postMessage).not.toHaveBeenCalled();
    expect(AuthManager.isAuthSessionReady()).toBe(false);
  });

  test("requires a service-worker script for additional configuration", async () => {
    const fetchApi = createPrimaryFetchApi();
    const serviceWorkerConfig = jest.fn(
      async (): Promise<AuthManagerServiceWorkerConfig> => ({
        additionalConfig: []
      })
    );

    await expect(AuthManager.beginAuthSession({ ...createParams(fetchApi), serviceWorkerConfig })).rejects.toThrow(
      "'serviceWorkerScript' field is required"
    );

    expect(serviceWorkerConfig).not.toHaveBeenCalled();
    expect(fetchApi).not.toHaveBeenCalled();
    expect(AuthManager.isAuthSessionActive()).toBe(false);
  });

  test("rejects additional configuration when service workers are unavailable", async () => {
    delete navigatorValue.serviceWorker;
    const fetchApi = createPrimaryFetchApi();
    const serviceWorkerConfig = jest.fn(
      async (): Promise<AuthManagerServiceWorkerConfig> => ({
        additionalConfig: []
      })
    );

    await expect(
      AuthManager.beginAuthSession({
        ...createParams(fetchApi),
        serviceWorkerConfig,
        serviceWorkerScript: "/bytescale-auth-sw.js"
      })
    ).rejects.toThrow("requires service workers");

    expect(serviceWorkerConfig).not.toHaveBeenCalled();
    expect(fetchApi).not.toHaveBeenCalled();
    expect(AuthManager.isAuthSessionActive()).toBe(false);
  });
});

function createParams(fetchApi: FetchApi): BeginAuthSessionParams {
  return {
    accountId: "account-a",
    authHeaders: async (): Promise<Record<string, string>> => ({ "X-App-Authorization": "app-token" }),
    authUrl: "https://app.example.com/auth",
    options: { fetchApi }
  };
}

function createPrimaryFetchApi(): jest.MockedFunction<FetchApi> {
  return jest.fn<FetchApi>(async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
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
}
