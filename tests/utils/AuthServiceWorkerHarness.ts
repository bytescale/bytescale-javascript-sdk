import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { Headers as NodeFetchHeaders, Request as NodeFetchRequest, Response as NodeFetchResponse } from "node-fetch";
import type { RequestInit as NodeFetchRequestInit } from "node-fetch";
import type { AuthSwConfigEntryDto, UrlRewriteRule } from "../../src/index.browser";
import type { AuthSwSetConfigDto } from "../../src/private/dtos/AuthSwSetConfigDto";

const currentWorkerSource = readFileSync(resolve(process.cwd(), "src/index.auth-sw.js"), "utf8");

interface FetchOptions {
  clientId?: string;
  headers?: HeadersInit;
  method?: string;
  navigation?: boolean;
}

interface FetchResult {
  outboundRequest: TestRequest | undefined;
  responded: boolean;
  response: NodeFetchResponse | undefined;
}

type WorkerEventListener = (event: unknown) => void;

export class AuthServiceWorkerHarness {
  private readonly clientsById = new Map<string, { type: "window"; url: string }>();
  private cacheReadDelayMilliseconds = 0;
  private readonly context: {
    getRewrittenUrl: (url: string, rules: UrlRewriteRule[]) => string | undefined;
    setConfig: (config: AuthSwConfigEntryDto[], rules?: UrlRewriteRule[]) => Promise<void>;
  };

  private readonly messageListener: WorkerEventListener;
  private readonly fetchListener: WorkerEventListener;
  private readonly fetchMock: jest.MockedFunction<(request: TestRequest) => Promise<NodeFetchResponse>>;

  constructor(
    private readonly upstreamResponse: NodeFetchResponse = new NodeFetchResponse("ok"),
    private readonly workerSource: string = currentWorkerSource,
    private readonly cacheEntries = new Map<string, NodeFetchResponse>()
  ) {
    const listeners = new Map<string, WorkerEventListener>();
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
      match: async (key: string): Promise<NodeFetchResponse | undefined> => {
        if (this.cacheReadDelayMilliseconds > 0) {
          await new Promise(resolve => setTimeout(resolve, this.cacheReadDelayMilliseconds));
        }
        return this.cacheEntries.get(key)?.clone();
      },
      put: async (key: string, value: NodeFetchResponse): Promise<void> => {
        this.cacheEntries.set(key, value.clone());
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
    const messageListener = listeners.get("message");
    if (messageListener === undefined) {
      throw new Error("Auth service worker did not register a message listener.");
    }
    this.messageListener = messageListener;
  }

  async setConfig(config: AuthSwConfigEntryDto[], rules?: UrlRewriteRule[]): Promise<void> {
    await this.context.setConfig(config, rules);
  }

  async dispatchMessage(message: AuthSwSetConfigDto): Promise<void> {
    let persistence: Promise<void> | undefined;
    this.messageListener({
      data: message,
      waitUntil: (promise: Promise<void>): void => {
        persistence = promise;
      }
    });
    expect(persistence).toBeDefined();
    await persistence;
  }

  restart(workerSource = this.workerSource): AuthServiceWorkerHarness {
    return new AuthServiceWorkerHarness(this.upstreamResponse, workerSource, this.cacheEntries);
  }

  getRewrittenUrl(url: string, rules: UrlRewriteRule[]): string | undefined {
    return this.context.getRewrittenUrl(url, rules);
  }

  setWindowClient(clientId: string, url: string): void {
    this.clientsById.set(clientId, { type: "window", url });
  }

  setPersistentConfig(config: AuthSwConfigEntryDto[], cacheReadDelayMilliseconds: number): void {
    this.cacheEntries.set("config", new NodeFetchResponse(JSON.stringify(config)));
    this.cacheReadDelayMilliseconds = cacheReadDelayMilliseconds;
  }

  async dispatchFetch(url: string, options: FetchOptions = {}): Promise<FetchResult> {
    this.fetchMock.mockClear();
    const request = new TestRequest(url, {
      headers: options.headers as NodeFetchRequestInit["headers"],
      method: options.method
    });
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
    expect(this.fetchMock).toHaveBeenCalledTimes(responsePromise === undefined ? 0 : 1);
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

export function authConfig(accountPath: string, token: string): AuthSwConfigEntryDto {
  return authConfigForUrl(`https://upcdn.io/${accountPath}`, token);
}

export function authConfigForUrl(urlPrefix: string, token: string): AuthSwConfigEntryDto {
  return {
    expires: undefined,
    headers: [{ key: "Authorization", value: `Bearer ${token}` }],
    urlPrefix
  };
}

export function rewriteRule(fromPath: string, toPath: string): UrlRewriteRule {
  return {
    fromUrlPrefix: `https://dashboard.example.com/${fromPath}`,
    toUrlPrefix: `https://upcdn.io/${toPath}`
  };
}
