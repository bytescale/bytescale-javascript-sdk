import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AuthSwConfigEntryDto } from "../src/index.browser";
import { AuthServiceWorkerHarness, authConfig, rewriteRule } from "./utils/AuthServiceWorkerHarness";

const mediaPrefix = "https://dashboard.example.com/media-auth/";
const downloadPrefix = "https://dashboard.example.com/download/";
const sourcePrefix = "https://app.example.com/private/";
const rules = [rewriteRule("media-auth/", ""), rewriteRule("download/", "")];
const oldWorkerSource = readFileSync(resolve(process.cwd(), "tests/fixtures/auth-sw-3.61.0.js"), "utf8");

describe("Auth service-worker original request URL restrictions", () => {
  test.each([
    { prefixes: undefined, directAuth: true, mediaAuth: true, downloadAuth: true },
    { prefixes: [], directAuth: false, mediaAuth: false, downloadAuth: false },
    { prefixes: [""], directAuth: true, mediaAuth: true, downloadAuth: true },
    { prefixes: [mediaPrefix], directAuth: false, mediaAuth: true, downloadAuth: false },
    { prefixes: [mediaPrefix, downloadPrefix], directAuth: false, mediaAuth: true, downloadAuth: true },
    { prefixes: ["https://upcdn.io/account-a/"], directAuth: true, mediaAuth: false, downloadAuth: false }
  ])("matches the original URL for $prefixes", async ({ prefixes, directAuth, mediaAuth, downloadAuth }) => {
    const harness = new AuthServiceWorkerHarness();
    await harness.setConfig([scopedConfig(prefixes)], rules);

    const direct = await harness.dispatchFetch("https://upcdn.io/account-a/image/example.jpg");
    expect(direct.responded).toBe(directAuth);
    expect(direct.outboundRequest?.headers.get("Authorization")).toBe(directAuth ? "Bearer token-a" : undefined);

    for (const [prefix, expectedAuth] of [
      [mediaPrefix, mediaAuth],
      [downloadPrefix, downloadAuth]
    ] as const) {
      const result = await harness.dispatchFetch(`${prefix}account-a/raw/example.jpg?download=true`, {
        navigation: true
      });
      expect(result.outboundRequest?.url).toBe("https://upcdn.io/account-a/raw/example.jpg?download=true");
      expect(result.outboundRequest?.headers.get("Authorization")).toBe(expectedAuth ? "Bearer token-a" : null);
    }
  });

  test("still checks the final account and CDN for an allowed alias", async () => {
    const harness = new AuthServiceWorkerHarness();
    await harness.setConfig([scopedConfig([mediaPrefix])], rules);

    const otherAccount = await harness.dispatchFetch(`${mediaPrefix}account-b/raw/example.jpg`);
    const similarAccount = await harness.dispatchFetch(`${mediaPrefix}account-a-extra/raw/example.jpg`);
    expect(otherAccount.outboundRequest?.headers.has("Authorization")).toBe(false);
    expect(similarAccount.outboundRequest?.headers.has("Authorization")).toBe(false);

    await harness.setConfig(
      [scopedConfig([mediaPrefix])],
      [{ fromUrlPrefix: mediaPrefix, toUrlPrefix: "https://other-cdn.example.com/" }]
    );
    const otherCdn = await harness.dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg`);
    expect(otherCdn.outboundRequest?.url).toBe("https://other-cdn.example.com/account-a/raw/example.jpg");
    expect(otherCdn.outboundRequest?.headers.has("Authorization")).toBe(false);
  });

  test.each([[], [downloadPrefix]].map((prefixes): { prefixes: typeof prefixes } => ({ prefixes })))(
    "continues to another eligible config after rejecting $prefixes",
    async ({ prefixes }) => {
      const harness = new AuthServiceWorkerHarness();
      await harness.setConfig(
        [
          { ...scopedConfig(prefixes), headers: [{ key: "X-Rejected", value: "must-not-leak" }] },
          scopedConfig([mediaPrefix]),
          { ...scopedConfig([mediaPrefix]), headers: [{ key: "Authorization", value: "Bearer later" }] }
        ],
        rules
      );

      const result = await harness.dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg`);
      expect(result.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-a");
      expect(result.outboundRequest?.headers.has("X-Rejected")).toBe(false);
    }
  );

  test("does not block an eligible destination config with a rejected original-prefix config", async () => {
    const harness = new AuthServiceWorkerHarness();
    await harness.setConfig(
      [
        scopedConfig([downloadPrefix]),
        {
          ...scopedConfig([mediaPrefix]),
          headers: [{ key: "Authorization", value: "Bearer token-b" }],
          urlPrefix: "!bytescale-request-scoped!https://upcdn.io/account-b/"
        }
      ],
      rules
    );

    const result = await harness.dispatchFetch(`${mediaPrefix}account-b/raw/example.jpg`);
    expect(result.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-b");
  });

  test.each([
    { requestPrefix: mediaPrefix, clientUrl: `${sourcePrefix}page`, authorized: true },
    { requestPrefix: mediaPrefix, clientUrl: "https://app.example.com/public/", authorized: false },
    { requestPrefix: downloadPrefix, clientUrl: `${sourcePrefix}page`, authorized: false },
    { requestPrefix: mediaPrefix, clientUrl: undefined, authorized: false }
  ])("combines resource and initiating-page restrictions: %j", async ({ requestPrefix, clientUrl, authorized }) => {
    const harness = new AuthServiceWorkerHarness();
    if (clientUrl !== undefined) {
      harness.setWindowClient("client", clientUrl);
    }
    await harness.setConfig([scopedConfig([mediaPrefix], [sourcePrefix])], rules);

    const result = await harness.dispatchFetch(`${requestPrefix}account-a/raw/example.jpg`, { clientId: "client" });
    expect(result.outboundRequest?.url).toBe("https://upcdn.io/account-a/raw/example.jpg");
    expect(result.outboundRequest?.headers.get("Authorization")).toBe(authorized ? "Bearer token-a" : null);
  });

  test("a rejected request restriction skips source lookup and permits a later config", async () => {
    const harness = new AuthServiceWorkerHarness();
    await harness.setConfig([scopedConfig([], [sourcePrefix]), scopedConfig([mediaPrefix])], rules);

    const result = await harness.dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg`);
    expect(result.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-a");
  });

  test.each(["expired", "empty source", "HEAD"])("keeps rewriting when auth is excluded by %s", async reason => {
    const harness = new AuthServiceWorkerHarness();
    const config = scopedConfig([mediaPrefix], reason === "empty source" ? [] : undefined);
    if (reason === "expired") {
      config.expires = Date.now() - 1;
    }
    await harness.setConfig([config], rules);

    const result = await harness.dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg?download=true`, {
      method: reason === "HEAD" ? "HEAD" : "GET"
    });
    expect(result.outboundRequest?.url).toBe("https://upcdn.io/account-a/raw/example.jpg?download=true");
    expect(result.outboundRequest?.headers.has("Authorization")).toBe(false);
  });

  test("does not strip caller headers from requests excluded by the restriction", async () => {
    const harness = new AuthServiceWorkerHarness();
    await harness.setConfig([scopedConfig([])], rules);
    const result = await harness.dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg`, {
      headers: { "Authorization": "Caller token", "Authorization-Token": "Caller access token", "Range": "bytes=0-9" }
    });
    expect(result.outboundRequest?.headers.get("Authorization")).toBe("Caller token");
    expect(result.outboundRequest?.headers.get("Authorization-Token")).toBe("Caller access token");
    expect(result.outboundRequest?.headers.get("Range")).toBe("bytes=0-9");
  });

  test.each(
    [undefined, [], [mediaPrefix, downloadPrefix]].map((prefixes): { prefixes: typeof prefixes } => ({ prefixes }))
  )("recovers restrictions and rewrites after restart: $prefixes", async ({ prefixes }) => {
    const harness = new AuthServiceWorkerHarness();
    await harness.dispatchMessage({
      type: "SET_BYTESCALE_AUTH_CONFIG",
      config: [scopedConfig(prefixes)],
      urlRewriteRules: rules
    });

    const direct = await harness.restart().dispatchFetch("https://upcdn.io/account-a/raw/example.jpg");
    expect(direct.outboundRequest?.headers.get("Authorization")).toBe(prefixes === undefined ? "Bearer token-a" : null);
    for (const prefix of [mediaPrefix, downloadPrefix]) {
      const alias = await harness
        .restart()
        .dispatchFetch(`${prefix}account-a/raw/example.jpg?download=true`, { navigation: true });
      expect(alias.outboundRequest?.url).toBe("https://upcdn.io/account-a/raw/example.jpg?download=true");
      expect(alias.outboundRequest?.headers.get("Authorization")).toBe(
        prefixes?.length === 0 ? null : "Bearer token-a"
      );
    }
  });

  test("recovers both restrictions after restart", async () => {
    const harness = new AuthServiceWorkerHarness();
    await harness.dispatchMessage({
      type: "SET_BYTESCALE_AUTH_CONFIG",
      config: [scopedConfig([mediaPrefix], [sourcePrefix])],
      urlRewriteRules: rules
    });
    const restarted = harness.restart();
    restarted.setWindowClient("client", `${sourcePrefix}page`);
    const allowed = await restarted.dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg`, { clientId: "client" });
    const rejected = await restarted.dispatchFetch(`${downloadPrefix}account-a/raw/example.jpg`, {
      clientId: "client"
    });
    expect(allowed.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-a");
    expect(rejected.outboundRequest?.headers.has("Authorization")).toBe(false);
  });

  test.each([null, "https://", [42]].map((prefixes): { prefixes: typeof prefixes } => ({ prefixes })))(
    "rejects malformed persisted request prefixes: $prefixes",
    async ({ prefixes }) => {
      const harness = new AuthServiceWorkerHarness();
      await harness.setConfig([scopedConfig(prefixes as unknown as string[])], rules);
      const result = await harness.restart().dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg`);
      expect(result.outboundRequest?.headers.has("Authorization")).toBe(false);
    }
  );

  test("rejects restricted configs without the compatibility marker", async () => {
    const harness = new AuthServiceWorkerHarness();
    await harness.setConfig([{ ...authConfig("account-a/", "token-a"), requestUrlPrefixes: [mediaPrefix] }], rules);
    const result = await harness.dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg`);
    expect(result.outboundRequest?.headers.has("Authorization")).toBe(false);
  });
});

describe("Auth service-worker version compatibility", () => {
  test.each(
    [undefined, [], [sourcePrefix]].map((sourcePrefixes): { sourcePrefixes: typeof sourcePrefixes } => ({
      sourcePrefixes
    }))
  )("3.61.0 skips request-scoped auth with source prefixes $sourcePrefixes", async ({ sourcePrefixes }) => {
    const oldWorker = new AuthServiceWorkerHarness(undefined, oldWorkerSource);
    oldWorker.setWindowClient("client", `${sourcePrefix}page`);
    await oldWorker.setConfig([scopedConfig([mediaPrefix, downloadPrefix], sourcePrefixes)], rules);
    const direct = await oldWorker.dispatchFetch("https://upcdn.io/account-a/raw/example.jpg", {
      clientId: "client"
    });
    expect(direct.responded).toBe(false);
    const alias = await oldWorker.dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg`, { clientId: "client" });
    expect(alias.outboundRequest?.url).toBe("https://upcdn.io/account-a/raw/example.jpg");
    expect(alias.outboundRequest?.headers.has("Authorization")).toBe(false);

    const recoveredOld = await oldWorker.restart().dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg`);
    expect(recoveredOld.outboundRequest?.headers.has("Authorization")).toBe(false);
    const upgraded = oldWorker.restart(readFileSync(resolve(process.cwd(), "src/index.auth-sw.js"), "utf8"));
    upgraded.setWindowClient("client", `${sourcePrefix}page`);
    const recoveredNew = await upgraded.dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg`, {
      clientId: "client"
    });
    expect(recoveredNew.outboundRequest?.headers.get("Authorization")).toBe(
      sourcePrefixes?.length === 0 ? null : "Bearer token-a"
    );
  });

  test("3.61.0 skips empty request prefixes before and after restart", async () => {
    const oldWorker = new AuthServiceWorkerHarness(undefined, oldWorkerSource);
    await oldWorker.setConfig([scopedConfig([])], rules);
    const alias = await oldWorker.dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg`);
    const direct = await oldWorker.restart().dispatchFetch("https://upcdn.io/account-a/raw/example.jpg");
    expect(alias.outboundRequest?.headers.has("Authorization")).toBe(false);
    expect(direct.outboundRequest?.headers.has("Authorization")).toBe(false);
  });

  test("3.61.0 still authenticates unrestricted configs from the new SDK", async () => {
    const oldWorker = new AuthServiceWorkerHarness(undefined, oldWorkerSource);
    await oldWorker.setConfig([scopedConfig(undefined)], rules);
    const result = await oldWorker.dispatchFetch(`${mediaPrefix}account-a/raw/example.jpg`);
    expect(result.outboundRequest?.headers.get("Authorization")).toBe("Bearer token-a");
  });
});

function scopedConfig(requestUrlPrefixes: string[] | undefined, sourceUrlPrefixes?: string[]): AuthSwConfigEntryDto {
  return {
    ...authConfig("account-a/", "token-a"),
    requestUrlPrefixes,
    sourceUrlPrefixes,
    urlPrefix: `${requestUrlPrefixes === undefined ? "" : "!bytescale-request-scoped!"}${
      sourceUrlPrefixes === undefined ? "" : "!bytescale-source-scoped!"
    }https://upcdn.io/account-a/`
  };
}
