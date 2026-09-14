import { jest } from "@jest/globals";
import { Response as NodeFetchResponse } from "node-fetch";
import { AuthServiceWorkerHarness, authConfig, authConfigForUrl, rewriteRule } from "./utils/AuthServiceWorkerHarness";

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

  test.each(
    [undefined, ["https://dashboard.example.com/download/"]].map((prefixes): { prefixes: typeof prefixes } => ({
      prefixes
    }))
  )("preserves streaming, range, and navigation behavior with request prefixes $prefixes", async ({ prefixes }) => {
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
    await harness.setConfig(
      [
        {
          ...authConfig("account-a/", "token-a"),
          requestUrlPrefixes: prefixes,
          urlPrefix: `${prefixes === undefined ? "" : "!bytescale-request-scoped!"}https://upcdn.io/account-a/`
        }
      ],
      [rewriteRule("download/", "account-a/")]
    );

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

  test("waits for delayed persistent authentication state on a cold start", async () => {
    const harness = new AuthServiceWorkerHarness();
    harness.setPersistentConfig([authConfig("account-a/", "token-a")], 300);

    const result = await harness.dispatchFetch("https://upcdn.io/account-a/file.pdf");

    expect(result.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-a");
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
