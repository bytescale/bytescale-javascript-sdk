import { readFileSync } from "fs";
import { jest } from "@jest/globals";
import { resolve } from "path";
import { runInNewContext } from "vm";

interface HeaderConfig {
  key: string;
  value: string;
}

interface AuthConfigEntry {
  expires?: number;
  headers: HeaderConfig[];
  sourceUrlPrefixes?: string[];
  urlPrefix: string;
}

interface SourceClient {
  frameType?: "nested" | "top-level";
  type: "window";
  url: string;
}

interface FetchResult {
  fetchedRequest?: Request;
  originalRequest: Request;
  respondWithCalled: boolean;
}

type WorkerListener = (event: any) => void;

const assetPrefix = "https://upcdn.io/account-a/";
const assetUrl = `${assetPrefix}raw/example.jpg`;
const sourceScopeMarker = "!bytescale-source-scoped!";

function config(
  token: string,
  sourceUrlPrefixes?: string[],
  headers: HeaderConfig[] = [{ key: "Authorization", value: `Bearer ${token}` }]
): AuthConfigEntry {
  return {
    expires: Date.now() + 60_000,
    headers,
    sourceUrlPrefixes,
    urlPrefix: `${sourceUrlPrefixes === undefined ? "" : sourceScopeMarker}${assetPrefix}`
  };
}

class WorkerHarness {
  readonly clients = new Map<string, SourceClient>();

  readonly clientsGet = jest.fn(
    async (clientId: string): Promise<SourceClient | undefined> => this.clients.get(clientId)
  );

  readonly fetchApi = jest.fn(async (_request: Request): Promise<Response> => new Response(null, { status: 204 }));

  private readonly listeners = new Map<string, WorkerListener>();

  constructor(cacheOpenFailure?: Error | "never") {
    const storedResponses = new Map<string, Response>();
    const cache = {
      match: async (key: string): Promise<Response | undefined> => storedResponses.get(key)?.clone(),
      put: async (key: string, response: Response): Promise<void> => {
        storedResponses.set(key, response.clone());
      }
    };
    const self = {
      addEventListener: (type: string, listener: WorkerListener): void => {
        this.listeners.set(type, listener);
      },
      clients: { claim: async (): Promise<void> => {}, get: this.clientsGet },
      skipWaiting: async (): Promise<void> => {}
    };

    runInNewContext(readFileSync(resolve(process.cwd(), "src/index.auth-sw.js"), "utf8"), {
      Date,
      Headers,
      Map,
      Promise,
      Request,
      Response,
      caches: {
        open: async (): Promise<typeof cache> => {
          if (cacheOpenFailure === "never") {
            return await new Promise(() => {});
          }
          if (cacheOpenFailure !== undefined) {
            throw cacheOpenFailure;
          }
          return cache;
        }
      },
      console: { error: jest.fn(), log: jest.fn() },
      fetch: this.fetchApi,
      self,
      setTimeout
    });
  }

  async setConfig(entries: AuthConfigEntry[]): Promise<void> {
    this.listener("message")({ data: { config: entries, type: "SET_BYTESCALE_AUTH_CONFIG" } });
    await Promise.resolve();
    await Promise.resolve();
  }

  async fetch(params: {
    clientId?: string;
    headers?: HeadersInit;
    method?: string;
    url?: string;
  }): Promise<FetchResult> {
    const originalRequest = new Request(params.url ?? assetUrl, {
      headers: params.headers,
      method: params.method ?? "GET"
    });
    const callsBefore = this.fetchApi.mock.calls.length;
    const responses: Array<Promise<Response>> = [];
    this.listener("fetch")({
      clientId: params.clientId ?? "",
      request: originalRequest,
      respondWith: (response: Response | PromiseLike<Response>): void => {
        responses.push(Promise.resolve(response));
      }
    });
    await Promise.all(responses);

    return {
      fetchedRequest: this.fetchApi.mock.calls[callsBefore]?.[0],
      originalRequest,
      respondWithCalled: responses.length > 0
    };
  }

  private listener(type: string): WorkerListener {
    const listener = this.listeners.get(type);
    if (listener === undefined) {
      throw new Error(`Missing service-worker '${type}' listener.`);
    }
    return listener;
  }
}

function windowClient(url: string, frameType: SourceClient["frameType"] = "top-level"): SourceClient {
  return { frameType, type: "window", url };
}

describe("Bytescale auth service worker", () => {
  test("overwrites configured headers without a source lookup when source prefixes are omitted", async () => {
    const worker = new WorkerHarness();
    await worker.setConfig([config("legacy")]);

    const injected = await worker.fetch({ clientId: "client-a" });
    const overwritten = await worker.fetch({
      clientId: "client-a",
      headers: { Authorization: "Bearer explicit" }
    });

    expect(injected.fetchedRequest?.headers.get("Authorization")).toBe("Bearer legacy");
    expect(overwritten.fetchedRequest?.headers.get("Authorization")).toBe("Bearer legacy");
    expect(worker.clientsGet).not.toHaveBeenCalled();
  });

  test.each([
    [["https://app.example.com/account/"], "one prefix"],
    [["https://elsewhere.example.com/", "https://app.example.com/account/"], "multiple prefixes"]
  ])("authorizes a matching source with %s", async (sourceUrlPrefixes: string[]) => {
    const worker = new WorkerHarness();
    worker.clients.set("client-a", windowClient("https://app.example.com/account/page"));
    await worker.setConfig([config("scoped", sourceUrlPrefixes)]);

    const result = await worker.fetch({ clientId: "client-a" });

    expect(result.fetchedRequest?.headers.get("Authorization")).toBe("Bearer scoped");
  });

  test("treats an empty prefix array as matching no clients", async () => {
    const worker = new WorkerHarness();
    await worker.setConfig([config("scoped", [])]);

    const result = await worker.fetch({ clientId: "client-a" });

    expect(result.respondWithCalled).toBe(false);
    expect(worker.clientsGet).not.toHaveBeenCalled();
  });

  test("overwrites configured headers while preserving other headers", async () => {
    const worker = new WorkerHarness();
    worker.clients.set("client-a", windowClient("https://app.example.com/page"));
    await worker.setConfig([
      config("unused", ["https://app.example.com/"], [{ key: "Authorization", value: "Bearer replacement" }])
    ]);

    const result = await worker.fetch({
      clientId: "client-a",
      headers: {
        "Authorization": "Bearer previous",
        "Authorization-Token": "previous-token",
        "Range": "bytes=10-20"
      }
    });

    expect(result.fetchedRequest?.headers.get("Authorization")).toBe("Bearer replacement");
    expect(result.fetchedRequest?.headers.get("Authorization-Token")).toBe("previous-token");
    expect(result.fetchedRequest?.headers.get("Range")).toBe("bytes=10-20");
  });

  test("leaves a non-matching source and its headers untouched", async () => {
    const worker = new WorkerHarness();
    worker.clients.set("client-a", windowClient("https://app.example.com/other/page"));
    await worker.setConfig([config("scoped", ["https://app.example.com/account/"])]);

    const result = await worker.fetch({
      clientId: "client-a",
      headers: { "Authorization": "Bearer explicit", "X-Trace-Id": "trace-a" }
    });

    expect(result.fetchedRequest).toBe(result.originalRequest);
    expect(result.fetchedRequest?.headers.get("Authorization")).toBe("Bearer explicit");
    expect(result.fetchedRequest?.headers.get("X-Trace-Id")).toBe("trace-a");
  });

  test.each(["missing", "stale", "failed"])("fails open for a %s client lookup", async scenario => {
    const worker = new WorkerHarness();
    await worker.setConfig([config("scoped", ["https://app.example.com/"])]);
    if (scenario === "failed") {
      worker.clientsGet.mockRejectedValueOnce(new Error("lookup failed"));
    }

    const result = await worker.fetch({
      clientId: scenario === "missing" ? undefined : "unknown-client",
      headers: { Authorization: "Bearer explicit" }
    });

    expect(result.fetchedRequest).toBe(result.originalRequest);
    expect(result.fetchedRequest?.headers.get("Authorization")).toBe("Bearer explicit");
    expect(worker.clientsGet).toHaveBeenCalledTimes(scenario === "missing" ? 0 : 1);
  });

  test("uses the original request when cached configuration cannot be loaded", async () => {
    const worker = new WorkerHarness(new Error("cache unavailable"));

    const result = await worker.fetch({ headers: { Authorization: "Bearer explicit" } });

    expect(result.fetchedRequest).toBe(result.originalRequest);
    expect(result.fetchedRequest?.headers.get("Authorization")).toBe("Bearer explicit");
  });

  test("does not indefinitely block a request while cached configuration is incomplete", async () => {
    const worker = new WorkerHarness("never");

    const result = await worker.fetch({ headers: { Authorization: "Bearer explicit" } });

    expect(result.fetchedRequest).toBe(result.originalRequest);
  });

  test("caches each client independently and supports nested iframe clients", async () => {
    const worker = new WorkerHarness();
    worker.clients.set("client-a", windowClient("https://app.example.com/page-a"));
    worker.clients.set("client-b", windowClient("https://app.example.com/page-b"));
    worker.clients.set("iframe-a", windowClient("https://app.example.com/frame", "nested"));
    await worker.setConfig([config("shared", ["https://app.example.com/"])]);

    for (const clientId of ["client-a", "client-a", "client-b", "iframe-a"]) {
      const result = await worker.fetch({ clientId });
      expect(result.fetchedRequest?.headers.get("Authorization")).toBe("Bearer shared");
    }

    expect(worker.clientsGet.mock.calls.map(([clientId]) => clientId)).toEqual(["client-a", "client-b", "iframe-a"]);
  });

  test("independent service workers can use different JWTs for the same asset prefix", async () => {
    const firstAppWorker = new WorkerHarness();
    const secondAppWorker = new WorkerHarness();
    firstAppWorker.clients.set("first-app", windowClient("https://first.example.com/page"));
    secondAppWorker.clients.set("second-app", windowClient("https://second.example.com/page"));
    await firstAppWorker.setConfig([config("first", ["https://first.example.com/"])]);
    await secondAppWorker.setConfig([config("second", ["https://second.example.com/"])]);

    const first = await firstAppWorker.fetch({ clientId: "first-app" });
    const second = await secondAppWorker.fetch({ clientId: "second-app" });

    expect(first.fetchedRequest?.headers.get("Authorization")).toBe("Bearer first");
    expect(second.fetchedRequest?.headers.get("Authorization")).toBe("Bearer second");
  });

  test("rejects non-asset and non-GET requests before looking up the client", async () => {
    const worker = new WorkerHarness();
    await worker.setConfig([config("scoped", ["https://app.example.com/"])]);

    const otherAsset = await worker.fetch({ clientId: "client-a", url: "https://upcdn.io/account-b/file.jpg" });
    const post = await worker.fetch({ clientId: "client-a", method: "POST" });

    expect(otherAsset.respondWithCalled).toBe(false);
    expect(post.respondWithCalled).toBe(false);
    expect(worker.clientsGet).not.toHaveBeenCalled();
  });

  test("requires the impossible marker for source-scoped entries", async () => {
    const worker = new WorkerHarness();
    const entry = config("scoped", ["https://app.example.com/"]);
    worker.clients.set("client-a", windowClient("https://app.example.com/page"));
    entry.urlPrefix = assetPrefix;
    await worker.setConfig([entry]);

    const result = await worker.fetch({ clientId: "client-a" });

    expect(result.respondWithCalled).toBe(false);
    expect(assetUrl.startsWith(`${sourceScopeMarker}${assetPrefix}`)).toBe(false);
  });
});
