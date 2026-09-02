import { jest } from "@jest/globals";
import { Response as NodeFetchResponse } from "node-fetch";
import { AuthSessionState } from "../src/private/AuthSessionState";
import { AuthSessionConfigState } from "../src/private/model/AuthSession";
import type {
  AuthSessionConfig,
  BeginAuthSessionParams,
  BeginAuthSessionParamsV2,
  UrlRewriteRule
} from "../src/index.browser";

type FetchApi = NonNullable<NonNullable<BeginAuthSessionParams["options"]>["fetchApi"]>;

interface AuthManagerApi {
  beginAuthSession: (params: BeginAuthSessionParams) => Promise<void>;
  endAuthSession: () => Promise<void>;
  isAuthSessionActive: () => boolean;
  isAuthSessionReady: () => boolean;
}

interface AuthManagerInternals extends AuthManagerApi {
  refreshAuthConfig: (
    session: NonNullable<ReturnType<typeof AuthSessionState.getSession>>,
    state: AuthSessionConfigState
  ) => Promise<void>;
  scheduler: { unschedule: (handle: number) => void };
}

const accountA = "A123abc";
const accountB = "B123abc";
const accountC = "C123abc";
const jwtA = "e30.e30.jwt-a";
const jwtB = "e30.e30.jwt-b";
const jwtC = "e30.e30.jwt-c";

describe("AuthManager browser multi-configuration sessions", () => {
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

  afterEach(async () => {
    navigatorValue.serviceWorker = serviceWorkerApi;
    await AuthManager.endAuthSession();
    jest.restoreAllMocks();
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

  test("preserves the complete V1 cookie flow and legacy default token", async () => {
    delete navigatorValue.serviceWorker;
    const fetchApi = createFetchApi();

    await AuthManager.beginAuthSession(v1Params(fetchApi));

    expect(AuthManager.isAuthSessionReady()).toBe(true);
    expect(AuthSessionState.getSession()?.accessToken).toBe("access-a");
    expect(fetchUrls(fetchApi)).toEqual([
      "https://app.example.com/auth-a",
      `https://upcdn.io/api/v1/access_tokens/${accountA}?set-cookie=true`
    ]);
    expect(postMessage).not.toHaveBeenCalled();

    await AuthManager.endAuthSession();
    expect(fetchUrls(fetchApi).at(-1)).toBe(`https://upcdn.io/api/v1/access_tokens/${accountA}?set-cookie=true`);
  });

  test("preserves V1 service-worker auth and unsupported-browser cookie fallback", async () => {
    const supportedFetch = createFetchApi();
    await AuthManager.beginAuthSession({ ...v1Params(supportedFetch), serviceWorkerScript: "/auth-sw.js" });

    expect((postMessage.mock.calls.at(-1)?.[0] as any).config).toEqual([
      {
        expires: expect.any(Number),
        headers: [{ key: "Authorization", value: `Bearer ${jwtA}` }],
        sourceUrlPrefixes: undefined,
        urlPrefix: `https://upcdn.io/${accountA}/`
      }
    ]);
    expect(fetchUrls(supportedFetch)[1]).toContain("set-cookie=false");
    await AuthManager.endAuthSession();

    postMessage.mockClear();
    delete navigatorValue.serviceWorker;
    const fallbackFetch = createFetchApi();
    await AuthManager.beginAuthSession({ ...v1Params(fallbackFetch), serviceWorkerScript: "/auth-sw.js" });

    expect(fetchUrls(fallbackFetch)[1]).toContain("set-cookie=true");
    expect(postMessage).not.toHaveBeenCalled();
  });

  test("initializes automatic and manual V2 configs and sends one aggregate worker model", async () => {
    const fetchApi = createFetchApi();
    const manualB = jest.fn(async () => jwtB);
    const manualC = jest.fn(async () => jwtC);
    const configs: [AuthSessionConfig, ...AuthSessionConfig[]] = [
      {
        accountId: accountA,
        authConfigId: undefined,
        authHeaders: async (): Promise<Record<string, string>> => ({ "X-App-Auth": "app-token" }),
        authUrl: "https://app.example.com/auth-a",
        sourceUrlPrefixes: ["https://app.example.com/"]
      },
      {
        accountId: accountB,
        authConfigId: "customer-b",
        getAuthorizationToken: manualB
      },
      {
        accountId: accountC,
        authConfigId: "cookie-c",
        enableCookieAuth: true,
        enableServiceWorkerAuth: false,
        getAuthorizationToken: manualC
      }
    ];
    const authConfigs = jest.fn(async () => configs);
    const urlRewriteRules: UrlRewriteRule[] = [
      {
        fromUrlPrefix: "https://app.example.com/download/",
        toUrlPrefix: `https://upcdn.io/${accountB}/`
      }
    ];

    await AuthManager.beginAuthSession({
      authConfigs,
      options: { fetchApi },
      serviceWorkerScript: "/auth-sw.js",
      urlRewriteRules
    });

    expect(AuthManager.isAuthSessionReady()).toBe(true);
    expect(authConfigs).toHaveBeenCalledTimes(1);
    expect(manualB).toHaveBeenCalledTimes(1);
    expect(manualC).toHaveBeenCalledTimes(1);
    const session = AuthSessionState.getSession();
    expect(session?.authConfigs?.map(state => state.accessToken)).toEqual(["access-a", "access-b", "access-c"]);
    expect(session?.accessToken).toBeUndefined();
    expect(fetchUrls(fetchApi).filter(url => url.includes("set-cookie=true"))).toEqual([
      `https://upcdn.io/api/v1/access_tokens/${accountC}?set-cookie=true`
    ]);
    expect(postMessage.mock.calls.at(-1)?.[0]).toEqual({
      config: [
        {
          expires: expect.any(Number),
          headers: [{ key: "Authorization", value: `Bearer ${jwtA}` }],
          sourceUrlPrefixes: ["https://app.example.com/"],
          urlPrefix: `!bytescale-source-scoped!https://upcdn.io/${accountA}/`
        },
        {
          expires: expect.any(Number),
          headers: [{ key: "Authorization", value: `Bearer ${jwtB}` }],
          sourceUrlPrefixes: undefined,
          urlPrefix: `https://upcdn.io/${accountB}/`
        }
      ],
      type: "SET_BYTESCALE_AUTH_CONFIG",
      urlRewriteRules
    });
  });

  test("uses each config's effective CDN URL for registration, worker prefixes, cleanup, and collisions", async () => {
    const fetchApi = createFetchApi();
    const defaultCdnUrl = "https://downloads-default.example.com";
    const customCdnUrl = "https://downloads-custom.example.com";
    const cookieCdnUrl = "https://downloads-cookie.example.com";

    await AuthManager.beginAuthSession({
      authConfigs: async () => [
        {
          ...apiOnlyConfig("custom-worker", accountA, async () => jwtA),
          cdnUrl: customCdnUrl,
          enableServiceWorkerAuth: true
        },
        {
          ...apiOnlyConfig("default-worker", accountA, async () => jwtB),
          enableServiceWorkerAuth: true
        },
        {
          ...apiOnlyConfig("cookie", accountA, async () => jwtC),
          cdnUrl: cookieCdnUrl,
          enableCookieAuth: true
        }
      ],
      options: { cdnUrl: defaultCdnUrl, fetchApi },
      serviceWorkerScript: "/auth-sw.js"
    });

    expect(fetchApi.mock.calls.filter(([, init]) => init?.method === "PUT").map(([input]) => inputUrl(input))).toEqual([
      `${customCdnUrl}/api/v1/access_tokens/${accountA}?set-cookie=false`,
      `${defaultCdnUrl}/api/v1/access_tokens/${accountA}?set-cookie=false`,
      `${cookieCdnUrl}/api/v1/access_tokens/${accountA}?set-cookie=true`
    ]);
    expect((postMessage.mock.calls.at(-1)?.[0] as any).config).toEqual([
      {
        expires: expect.any(Number),
        headers: [{ key: "Authorization", value: `Bearer ${jwtA}` }],
        sourceUrlPrefixes: undefined,
        urlPrefix: `${customCdnUrl}/${accountA}/`
      },
      {
        expires: expect.any(Number),
        headers: [{ key: "Authorization", value: `Bearer ${jwtB}` }],
        sourceUrlPrefixes: undefined,
        urlPrefix: `${defaultCdnUrl}/${accountA}/`
      }
    ]);

    await AuthManager.endAuthSession();

    expect(
      fetchApi.mock.calls.filter(([, init]) => init?.method === "DELETE").map(([input]) => inputUrl(input))
    ).toEqual([`${cookieCdnUrl}/api/v1/access_tokens/${accountA}?set-cookie=true`]);
  });

  test("supports a manual cookie-only V2 config without a service worker", async () => {
    delete navigatorValue.serviceWorker;
    const fetchApi = createFetchApi();
    const provider = jest.fn(async () => jwtA);

    await AuthManager.beginAuthSession({
      authConfigs: async () => [
        {
          accountId: accountA,
          authConfigId: undefined,
          enableCookieAuth: true,
          enableServiceWorkerAuth: false,
          getAuthorizationToken: provider
        }
      ],
      options: { fetchApi }
    });

    expect(AuthManager.isAuthSessionReady()).toBe(true);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(fetchUrls(fetchApi)).toEqual([`https://upcdn.io/api/v1/access_tokens/${accountA}?set-cookie=true`]);
    expect(postMessage).not.toHaveBeenCalled();
  });

  test("refreshes configs independently and preserves a still-valid token after failure", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const fetchApi = createFetchApi();
    const providerA = jest.fn(async () => jwtA);
    const providerB = jest.fn<() => Promise<string>>().mockResolvedValueOnce(jwtB).mockRejectedValueOnce("offline");

    await AuthManager.beginAuthSession({
      authConfigs: async () => [apiOnlyConfig(undefined, accountA, providerA), apiOnlyConfig("b", accountB, providerB)],
      options: { fetchApi }
    });
    const session = AuthSessionState.getSession();
    const stateB = session?.authConfigs?.[1];
    if (session === undefined || stateB === undefined) {
      throw new Error("Expected initialized auth state.");
    }
    const previousExpiry = stateB.expiresAt;
    const internals = AuthManager as AuthManagerInternals;
    await internals.refreshAuthConfig(session, stateB);

    expect(providerA).toHaveBeenCalledTimes(1);
    expect(providerB).toHaveBeenCalledTimes(2);
    expect(stateB.accessToken).toBe("access-b");
    expect(stateB.jwt).toBe(jwtB);
    expect(stateB.expiresAt).toBe(previousExpiry);
    expect(AuthManager.isAuthSessionReady()).toBe(true);
  });

  test("clears the cookie-enabled config and the complete worker config on end", async () => {
    const fetchApi = createFetchApi();
    await AuthManager.beginAuthSession({
      authConfigs: async () => [
        {
          accountId: accountA,
          authConfigId: "worker",
          getAuthorizationToken: async () => jwtA
        },
        {
          accountId: accountB,
          authConfigId: "cookie",
          enableCookieAuth: true,
          enableServiceWorkerAuth: false,
          getAuthorizationToken: async () => jwtB
        }
      ],
      options: { fetchApi },
      serviceWorkerScript: "/auth-sw.js"
    });

    await AuthManager.endAuthSession();

    expect(fetchApi.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(1);
    expect(fetchUrls(fetchApi).at(-1)).toBe(`https://upcdn.io/api/v1/access_tokens/${accountB}?set-cookie=true`);
    expect(postMessage.mock.calls.at(-1)?.[0]).toEqual({ config: [], type: "SET_BYTESCALE_AUTH_CONFIG" });
    expect(AuthManager.isAuthSessionActive()).toBe(false);
    await expect(AuthManager.endAuthSession()).resolves.toBeUndefined();
  });

  test.each([
    {
      name: "empty auth config array",
      params: (fetchApi: FetchApi) =>
        ({ authConfigs: async () => [], options: { fetchApi } } as unknown as BeginAuthSessionParamsV2),
      error: "non-empty array"
    },
    {
      name: "duplicate named IDs",
      params: (fetchApi: FetchApi) =>
        v2Params(fetchApi, [
          apiOnlyConfig("same", accountA, async () => jwtA),
          apiOnlyConfig("same", accountB, async () => jwtB)
        ]),
      error: "Duplicate auth configuration ID"
    },
    {
      name: "multiple defaults",
      params: (fetchApi: FetchApi) =>
        v2Params(fetchApi, [
          apiOnlyConfig(undefined, accountA, async () => jwtA),
          apiOnlyConfig(undefined, accountB, async () => jwtB)
        ]),
      error: "Only one default"
    },
    {
      name: "multiple cookie configs",
      params: (fetchApi: FetchApi) =>
        v2Params(fetchApi, [
          { ...apiOnlyConfig("a", accountA, async () => jwtA), enableCookieAuth: true },
          { ...apiOnlyConfig("b", accountB, async () => jwtB), enableCookieAuth: true }
        ]),
      error: "Only one auth configuration may enable cookie"
    },
    {
      name: "missing service-worker script",
      params: (fetchApi: FetchApi) =>
        v2Params(fetchApi, [{ ...apiOnlyConfig("a", accountA, async () => jwtA), enableServiceWorkerAuth: true }]),
      error: "serviceWorkerScript"
    },
    {
      name: "duplicate worker destination",
      params: (fetchApi: FetchApi): BeginAuthSessionParamsV2 => ({
        ...v2Params(fetchApi, [
          { ...apiOnlyConfig("a", accountA, async () => jwtA), enableServiceWorkerAuth: true },
          { ...apiOnlyConfig("b", accountA, async () => jwtB), enableServiceWorkerAuth: true }
        ]),
        serviceWorkerScript: "/auth-sw.js"
      }),
      error: "same URL prefix"
    },
    {
      name: "invalid account ID",
      params: (fetchApi: FetchApi) => v2Params(fetchApi, [apiOnlyConfig("a", "A12/abc", async () => jwtA)]),
      error: "Invalid Bytescale account ID"
    },
    {
      name: "invalid config CDN URL",
      params: (fetchApi: FetchApi) =>
        v2Params(fetchApi, [
          { ...apiOnlyConfig("a", accountA, async () => jwtA), cdnUrl: 123 } as unknown as AuthSessionConfig
        ]),
      error: "cdnUrl"
    },
    {
      name: "overlapping cookie and worker accounts",
      params: (fetchApi: FetchApi): BeginAuthSessionParamsV2 => ({
        ...v2Params(fetchApi, [
          { ...apiOnlyConfig("cookie", accountA, async () => jwtA), enableCookieAuth: true },
          { ...apiOnlyConfig("worker", accountA, async () => jwtB), enableServiceWorkerAuth: true }
        ]),
        serviceWorkerScript: "/auth-sw.js"
      }),
      error: "Cookie and service-worker authentication"
    }
  ])("rejects $name before invoking a provider", async ({ params, error }) => {
    const fetchApi = createFetchApi();

    await expect(AuthManager.beginAuthSession(params(fetchApi))).rejects.toThrow(error);

    expect(fetchApi).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
    expect(AuthManager.isAuthSessionActive()).toBe(false);
  });

  test("rejects V2 service-worker features when the browser cannot enforce them", async () => {
    delete navigatorValue.serviceWorker;
    const fetchApi = createFetchApi();
    const provider = jest.fn(async () => jwtA);

    await expect(
      AuthManager.beginAuthSession({
        authConfigs: async () => [
          {
            accountId: accountA,
            authConfigId: undefined,
            getAuthorizationToken: provider
          }
        ],
        options: { fetchApi },
        serviceWorkerScript: "/auth-sw.js"
      })
    ).rejects.toThrow("does not support");

    expect(provider).not.toHaveBeenCalled();
    expect(fetchApi).not.toHaveBeenCalled();
  });

  test.each(["", "not-a-jwt"])("rejects a malformed manual token and disposes the partial V2 session", async token => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const fetchApi = createFetchApi();

    await expect(
      AuthManager.beginAuthSession({
        authConfigs: async () => [apiOnlyConfig(undefined, accountA, async () => token)],
        options: { fetchApi }
      })
    ).rejects.toThrow("malformed");

    expect(fetchApi).not.toHaveBeenCalled();
    expect(AuthManager.isAuthSessionActive()).toBe(false);
  });
});

function apiOnlyConfig(
  authConfigId: string | undefined,
  accountId: string,
  provider: () => Promise<string>
): AuthSessionConfig {
  return {
    accountId,
    authConfigId,
    enableServiceWorkerAuth: false,
    getAuthorizationToken: provider
  };
}

function createFetchApi(): jest.MockedFunction<FetchApi> {
  return jest.fn<FetchApi>(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = inputUrl(input);
    if (init?.method === "GET") {
      const suffix = url.split("auth-")[1] ?? "a";
      const jwt = suffix === "a" ? jwtA : suffix === "b" ? jwtB : jwtC;
      return new NodeFetchResponse(jwt, {
        headers: { "Content-Type": "text/plain" }
      }) as unknown as Response;
    }
    if (init?.method === "PUT") {
      const accountId = url.split("/access_tokens/")[1]?.split("?")[0];
      const suffix = accountId === accountA ? "a" : accountId === accountB ? "b" : "c";
      return new NodeFetchResponse(
        JSON.stringify({ accessToken: `access-${suffix}`, ttlSeconds: 3600 })
      ) as unknown as Response;
    }
    if (init?.method === "DELETE") {
      return new NodeFetchResponse(null, { status: 204 }) as unknown as Response;
    }
    throw new Error(`Unexpected request: ${init?.method ?? "undefined"} ${url}`);
  });
}

function fetchUrls(fetchApi: jest.MockedFunction<FetchApi>): string[] {
  return fetchApi.mock.calls.map(([input]) => inputUrl(input));
}

function v1Params(fetchApi: FetchApi): BeginAuthSessionParams {
  return {
    accountId: accountA,
    authHeaders: async (): Promise<Record<string, string>> => ({ "X-App-Authorization": "app-token" }),
    authUrl: "https://app.example.com/auth-a",
    options: { fetchApi }
  };
}

function inputUrl(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
}

function v2Params(fetchApi: FetchApi, configs: AuthSessionConfig[]): BeginAuthSessionParamsV2 {
  return {
    authConfigs: async () => configs as [AuthSessionConfig, ...AuthSessionConfig[]],
    options: { fetchApi }
  };
}
