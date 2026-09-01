import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { Headers as NodeFetchHeaders, Request as NodeFetchRequest, Response as NodeFetchResponse } from "node-fetch";
import type { RequestInit as NodeFetchRequestInit } from "node-fetch";
import type { AuthSwConfigEntryDto, UrlRewriteRule } from "../src/index.browser";

const workerSource = readFileSync(resolve(process.cwd(), "src/index.auth-sw.js"), "utf8");

describe("Auth service-worker URL rewriting", () => {
  test("preserves the remaining path, query string, and fragment", async () => {
    const harness = new AuthServiceWorkerHarness();
    const rules = [rewriteRule("download/", "account-a/")];
    await harness.setConfig([], rules);

    const result = await harness.dispatchFetch(
      "https://dashboard.example.com/download/path/to/file.pdf?download=true&version=2"
    );

    expect(result.outboundRequest?.url).toBe("https://upcdn.io/account-a/path/to/file.pdf?download=true&version=2");
    expect(harness.getRewrittenUrl("https://dashboard.example.com/download/file.pdf?download=true#page=2", rules)).toBe(
      "https://upcdn.io/account-a/file.pdf?download=true#page=2"
    );
  });

  test("matches authentication against the rewritten URL and supports navigation requests", async () => {
    const upstreamResponse = new NodeFetchResponse("streamed-body", {
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Disposition": 'attachment; filename="file.pdf"',
        "Content-Length": "13",
        "Content-Range": "bytes 0-12/13",
        "Content-Type": "application/pdf"
      },
      status: 206
    });
    const blob = jest.spyOn(upstreamResponse, "blob");
    const arrayBuffer = jest.spyOn(upstreamResponse, "arrayBuffer");
    const harness = new AuthServiceWorkerHarness(upstreamResponse);
    await harness.setConfig([authConfig("account-a/", "token-a")], [rewriteRule("download/", "account-a/")]);

    const result = await harness.dispatchFetch("https://dashboard.example.com/download/file.pdf", {
      headers: {
        "If-Modified-Since": "Wed, 21 Oct 2015 07:28:00 GMT",
        "If-None-Match": '"etag"',
        "If-Range": '"range-etag"',
        "Range": "bytes=0-12"
      },
      navigation: true
    });

    expect(result.outboundRequest?.url).toBe("https://upcdn.io/account-a/file.pdf");
    expect(result.outboundRequest?.mode).toBe("cors");
    expect(result.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-a");
    expect(result.outboundRequest?.headers.get("Range")).toBe("bytes=0-12");
    expect(result.outboundRequest?.headers.get("If-Range")).toBe('"range-etag"');
    expect(result.outboundRequest?.headers.get("If-None-Match")).toBe('"etag"');
    expect(result.outboundRequest?.headers.get("If-Modified-Since")).toBe("Wed, 21 Oct 2015 07:28:00 GMT");
    expect(result.response).toBe(upstreamResponse);
    expect(result.response?.status).toBe(206);
    expect(result.response?.headers.get("Content-Disposition")).toBe('attachment; filename="file.pdf"');
    expect(result.response?.headers.get("Accept-Ranges")).toBe("bytes");
    expect(blob).not.toHaveBeenCalled();
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  test("selects different authentication configurations for different rewrite destinations", async () => {
    const harness = new AuthServiceWorkerHarness();
    await harness.setConfig(
      [authConfig("account-a/", "token-a"), authConfig("account-b/", "token-b")],
      [rewriteRule("download-a/", "account-a/"), rewriteRule("download-b/", "account-b/")]
    );

    const first = await harness.dispatchFetch("https://dashboard.example.com/download-a/file.pdf");
    const second = await harness.dispatchFetch("https://dashboard.example.com/download-b/file.pdf");

    expect(first.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-a");
    expect(second.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-b");
  });

  test("never selects a token from the original URL", async () => {
    const harness = new AuthServiceWorkerHarness();
    await harness.setConfig(
      [authConfigForUrl("https://dashboard.example.com/download/", "original-token")],
      [rewriteRule("download/", "unconfigured-account/")]
    );

    const result = await harness.dispatchFetch("https://dashboard.example.com/download/file.pdf");

    expect(result.outboundRequest?.url).toBe("https://upcdn.io/unconfigured-account/file.pdf");
    expect(result.outboundRequest?.headers.has("Authorization")).toBe(false);
  });

  test("fetches rewritten requests even when no authentication configuration matches", async () => {
    const harness = new AuthServiceWorkerHarness();
    await harness.setConfig([], [rewriteRule("download/", "public-account/")]);

    const result = await harness.dispatchFetch("https://dashboard.example.com/download/public.pdf");

    expect(result.responded).toBe(true);
    expect(result.outboundRequest?.url).toBe("https://upcdn.io/public-account/public.pdf");
    expect(result.outboundRequest?.headers.has("Authorization")).toBe(false);
  });

  test("uses only the first matching rewrite rule", async () => {
    const harness = new AuthServiceWorkerHarness();
    await harness.setConfig(
      [authConfig("account-a/", "token-a"), authConfig("account-b/", "token-b")],
      [rewriteRule("download/", "account-a/"), rewriteRule("download/", "account-b/")]
    );

    const result = await harness.dispatchFetch("https://dashboard.example.com/download/file.pdf");

    expect(result.outboundRequest?.url).toBe("https://upcdn.io/account-a/file.pdf");
    expect(result.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-a");
  });

  test("does not recursively rewrite the rewritten URL", async () => {
    const harness = new AuthServiceWorkerHarness();
    await harness.setConfig(
      [authConfig("account-a/", "token-a")],
      [
        {
          fromUrlPrefix: "https://dashboard.example.com/download/",
          toUrlPrefix: "https://proxy.example.com/download/"
        },
        {
          fromUrlPrefix: "https://proxy.example.com/download/",
          toUrlPrefix: "https://upcdn.io/account-a/"
        }
      ]
    );

    const result = await harness.dispatchFetch("https://dashboard.example.com/download/file.pdf");

    expect(result.outboundRequest?.url).toBe("https://proxy.example.com/download/file.pdf");
    expect(result.outboundRequest?.headers.has("Authorization")).toBe(false);
  });

  test("retains existing behavior when no rewrite rule matches", async () => {
    const harness = new AuthServiceWorkerHarness();
    await harness.setConfig([authConfig("account-a/", "token-a")], [rewriteRule("download/", "account-a/")]);

    const authenticated = await harness.dispatchFetch("https://upcdn.io/account-a/file.pdf");
    const untouched = await harness.dispatchFetch("https://dashboard.example.com/ordinary-page");

    expect(authenticated.outboundRequest?.url).toBe("https://upcdn.io/account-a/file.pdf");
    expect(authenticated.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-a");
    expect(untouched.responded).toBe(false);
  });

  test("keeps source-page authorization independent across multiple client IDs", async () => {
    const harness = new AuthServiceWorkerHarness();
    harness.setWindowClient("client-a", "https://app.example.com/a/");
    harness.setWindowClient("client-b", "https://app.example.com/b/");
    await harness.setConfig([
      {
        ...authConfig("account-a/", "token-a"),
        sourceUrlPrefixes: ["https://app.example.com/a/"],
        urlPrefix: "!bytescale-source-scoped!https://upcdn.io/account-a/"
      },
      {
        ...authConfig("account-b/", "token-b"),
        sourceUrlPrefixes: ["https://app.example.com/b/"],
        urlPrefix: "!bytescale-source-scoped!https://upcdn.io/account-b/"
      }
    ]);

    const a = await harness.dispatchFetch("https://upcdn.io/account-a/file.pdf", { clientId: "client-a" });
    const wrongSource = await harness.dispatchFetch("https://upcdn.io/account-a/file.pdf", {
      clientId: "client-b"
    });
    const b = await harness.dispatchFetch("https://upcdn.io/account-b/file.pdf", { clientId: "client-b" });

    expect(a.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-a");
    expect(wrongSource.responded).toBe(true);
    expect(wrongSource.outboundRequest?.headers.has("Authorization")).toBe(false);
    expect(b.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-b");
  });

  test("source-scoped auth replaces both authentication headers and preserves unrelated headers", async () => {
    const harness = new AuthServiceWorkerHarness();
    harness.setWindowClient("client-a", "https://app.example.com/a/");
    await harness.setConfig([
      {
        ...authConfig("account-a/", "token-a"),
        sourceUrlPrefixes: ["https://app.example.com/a/"],
        urlPrefix: "!bytescale-source-scoped!https://upcdn.io/account-a/"
      }
    ]);

    const result = await harness.dispatchFetch("https://upcdn.io/account-a/file.pdf", {
      clientId: "client-a",
      headers: {
        "Authorization": "Bearer stale",
        "Authorization-Token": "stale-token",
        "X-Trace-Id": "trace"
      }
    });

    expect(result.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-a");
    expect(result.outboundRequest?.headers.has("Authorization-Token")).toBe(false);
    expect(result.outboundRequest?.headers.get("X-Trace-Id")).toBe("trace");
  });
});

interface FetchOptions {
  clientId?: string;
  headers?: HeadersInit;
  navigation?: boolean;
}

interface FetchResult {
  outboundRequest: TestRequest | undefined;
  responded: boolean;
  response: NodeFetchResponse | undefined;
}

type WorkerEventListener = (event: unknown) => void;

class AuthServiceWorkerHarness {
  private readonly clientsById = new Map<string, { type: "window"; url: string }>();
  private readonly context: {
    getRewrittenUrl: (url: string, rules: UrlRewriteRule[]) => string | undefined;
    setConfig: (config: AuthSwConfigEntryDto[], rules?: UrlRewriteRule[]) => Promise<void>;
  };

  private readonly fetchListener: WorkerEventListener;
  private readonly fetchMock: jest.MockedFunction<(request: TestRequest) => Promise<NodeFetchResponse>>;

  constructor(private readonly upstreamResponse: NodeFetchResponse = new NodeFetchResponse("ok")) {
    const listeners = new Map<string, WorkerEventListener>();
    const cacheEntries = new Map<string, NodeFetchResponse>();
    this.fetchMock = jest.fn(async (_request: TestRequest): Promise<NodeFetchResponse> => this.upstreamResponse);

    const self = {
      addEventListener: (type: string, listener: WorkerEventListener): void => {
        listeners.set(type, listener);
      },
      clients: {
        claim: async (): Promise<void> => {},
        get: async (clientId: string): Promise<{ type: "window"; url: string } | undefined> =>
          this.clientsById.get(clientId)
      },
      skipWaiting: async (): Promise<void> => {}
    };
    const cache = {
      match: async (key: string): Promise<NodeFetchResponse | undefined> => cacheEntries.get(key)?.clone(),
      put: async (key: string, value: NodeFetchResponse): Promise<void> => {
        cacheEntries.set(key, value.clone());
      }
    };
    const sandbox = {
      caches: { open: async (): Promise<typeof cache> => cache },
      console: { error: jest.fn(), log: jest.fn() },
      fetch: this.fetchMock,
      Headers: NodeFetchHeaders,
      Promise,
      Request: TestRequest,
      Response: NodeFetchResponse,
      self,
      setTimeout
    };
    runInNewContext(workerSource, sandbox);

    this.context = sandbox as typeof sandbox & AuthServiceWorkerHarness["context"];
    const fetchListener = listeners.get("fetch");
    if (fetchListener === undefined) {
      throw new Error("Auth service worker did not register a fetch listener.");
    }
    this.fetchListener = fetchListener;
  }

  async setConfig(config: AuthSwConfigEntryDto[], rules?: UrlRewriteRule[]): Promise<void> {
    await this.context.setConfig(config, rules);
  }

  getRewrittenUrl(url: string, rules: UrlRewriteRule[]): string | undefined {
    return this.context.getRewrittenUrl(url, rules);
  }

  setWindowClient(clientId: string, url: string): void {
    this.clientsById.set(clientId, { type: "window", url });
  }

  async dispatchFetch(url: string, options: FetchOptions = {}): Promise<FetchResult> {
    const request = new TestRequest(url, { headers: options.headers as NodeFetchRequestInit["headers"] });
    if (options.navigation === true) {
      Object.defineProperty(request, "mode", { configurable: true, value: "navigate" });
    }

    let responsePromise: Promise<NodeFetchResponse> | undefined;
    this.fetchListener({
      clientId: options.clientId ?? "",
      request,
      respondWith: (response: NodeFetchResponse | Promise<NodeFetchResponse>): void => {
        responsePromise = Promise.resolve(response);
      }
    });

    const response = await responsePromise;
    return {
      outboundRequest: this.fetchMock.mock.calls.at(-1)?.[0],
      responded: responsePromise !== undefined,
      response
    };
  }
}

class TestRequest extends NodeFetchRequest {
  readonly mode: RequestMode;

  constructor(input: string | NodeFetchRequest, init: NodeFetchRequestInit & { mode?: RequestMode } = {}) {
    super(input, init);
    this.mode = init.mode ?? (input instanceof TestRequest ? input.mode : "cors");
  }
}

function authConfig(accountPath: string, token: string): AuthSwConfigEntryDto {
  return authConfigForUrl(`https://upcdn.io/${accountPath}`, token);
}

function authConfigForUrl(urlPrefix: string, token: string): AuthSwConfigEntryDto {
  return {
    expires: undefined,
    headers: [{ key: "Authorization", value: `Bearer ${token}` }],
    urlPrefix
  };
}

function rewriteRule(fromPath: string, toPath: string): UrlRewriteRule {
  return {
    fromUrlPrefix: `https://dashboard.example.com/${fromPath}`,
    toUrlPrefix: `https://upcdn.io/${toPath}`
  };
}
