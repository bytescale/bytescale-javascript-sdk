import { jest } from "@jest/globals";

interface WorkerConfigMessage {
  config: Array<{
    headers: Array<{ key: string; value: string }>;
    sourceUrlPrefixes?: string[];
    urlPrefix: string;
  }>;
  type: "SET_BYTESCALE_AUTH_CONFIG";
}

describe("AuthManager service-worker source scoping", () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  afterAll(() => {
    for (const [key, descriptor] of [
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

  test("uses a fail-closed marker only when source prefixes are supplied", async () => {
    const postMessage = jest.fn((_message: unknown): void => {});
    const activeWorker = { postMessage, state: "activated" } as unknown as ServiceWorker;
    const registration = {
      active: activeWorker,
      installing: null,
      scope: "https://app.example.com/",
      waiting: null
    } as unknown as ServiceWorkerRegistration;
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        serviceWorker: {
          controller: activeWorker,
          getRegistrations: jest.fn(async (): Promise<ServiceWorkerRegistration[]> => [registration]),
          register: jest.fn(async (): Promise<ServiceWorkerRegistration> => registration)
        }
      }
    });
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
    const { AuthManager } = await import("../src/public/browser/AuthManagerBrowser");

    const fetchApi = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      switch (init?.method) {
        case "GET":
          return new Response("jwt-a", { headers: { "Content-Type": "text/plain" } });
        case "PUT":
          return new Response(JSON.stringify({ accessToken: "access-a", ttlSeconds: 3600 }));
        case "DELETE":
          return new Response(null, { status: 204 });
        default:
          throw new Error(`Unexpected request method: ${init?.method ?? "undefined"}`);
      }
    });
    const params = {
      accountId: "account-a",
      authHeaders: async (): Promise<Record<string, string>> => ({}),
      authUrl: "https://app.example.com/auth",
      options: { fetchApi },
      serviceWorkerScript: "/bytescale-auth-sw.js"
    };

    await AuthManager.beginAuthSession({
      ...params,
      sourceUrlPrefixes: ["https://app.example.com/app/", "https://app.example.com/frame/"]
    });

    const scopedMessage = postMessage.mock.calls[0][0] as WorkerConfigMessage;
    const scopedEntry = scopedMessage.config[0];
    expect(scopedEntry.sourceUrlPrefixes).toEqual(["https://app.example.com/app/", "https://app.example.com/frame/"]);
    expect(scopedEntry.urlPrefix).toBe("!bytescale-source-scoped!https://upcdn.io/account-a/");
    expect("https://upcdn.io/account-a/file.jpg".startsWith(scopedEntry.urlPrefix)).toBe(false);

    await AuthManager.endAuthSession();
    expect(postMessage.mock.calls[1][0]).toEqual({ config: [], type: "SET_BYTESCALE_AUTH_CONFIG" });

    await AuthManager.beginAuthSession(params);

    const legacyMessage = postMessage.mock.calls[2][0] as WorkerConfigMessage;
    expect(legacyMessage.config[0].sourceUrlPrefixes).toBeUndefined();
    expect(legacyMessage.config[0].urlPrefix).toBe("https://upcdn.io/account-a/");

    await AuthManager.endAuthSession();
  });
});
