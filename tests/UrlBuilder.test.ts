import { UrlBuilder } from "../src/public/shared";

describe("UrlBuilder", () => {
  test("raw file without params", () => {
    const actual = UrlBuilder.url({ accountId: "1234abc", filePath: "/example.jpg" });
    const expected = "https://upcdn.io/1234abc/raw/example.jpg";
    expect(actual).toEqual(expected);
  });

  test("raw file with one param", () => {
    const actual = UrlBuilder.url({ accountId: "1234abc", filePath: "/example.jpg", options: { auth: true } });
    const expected = "https://upcdn.io/1234abc/raw/example.jpg";
    expect(actual).toEqual(expected);
  });

  test("raw file with multiple params", () => {
    const actual = UrlBuilder.url({
      accountId: "1234abc",
      filePath: "/example.jpg",
      options: { auth: true, cache: true, version: "42" }
    });
    const expected = "https://upcdn.io/1234abc/raw/example.jpg?cache=true&version=42";
    expect(actual).toEqual(expected);
  });

  test("raw file with rewritten params", () => {
    const actual = UrlBuilder.url({
      accountId: "1234abc",
      filePath: "/example.jpg",
      options: { auth: true, cache: true, cacheTtl: 100 } // cacheTtl is rewritten to cache_ttl
    });
    const expected = "https://upcdn.io/1234abc/raw/example.jpg?cache=true&cache_ttl=100";
    expect(actual).toEqual(expected);
  });

  test("transformation preset without params", () => {
    const actual = UrlBuilder.url({
      accountId: "1234abc",
      filePath: "/example.jpg",
      options: { transformation: "preset", transformationPreset: "thumbnail" }
    });
    const expected = "https://upcdn.io/1234abc/thumbnail/example.jpg";
    expect(actual).toEqual(expected);
  });

  test("transformation preset with one param", () => {
    const actual = UrlBuilder.url({
      accountId: "1234abc",
      filePath: "/example.jpg",
      options: { transformation: "preset", transformationPreset: "thumbnail", artifact: "/foo" }
    });
    const expected = "https://upcdn.io/1234abc/thumbnail/example.jpg?artifact=%2Ffoo";
    expect(actual).toEqual(expected);
  });

  test("transformation preset with multiple params", () => {
    const actual = UrlBuilder.url({
      accountId: "1234abc",
      filePath: "/example.jpg",
      options: { transformation: "preset", transformationPreset: "thumbnail", artifact: "/foo" }
    });
    const expected = "https://upcdn.io/1234abc/thumbnail/example.jpg?artifact=%2Ffoo";
    expect(actual).toEqual(expected);
  });

  test("transformation preset with rewritten params", () => {
    const actual = UrlBuilder.url({
      accountId: "1234abc",
      filePath: "/example.jpg",
      options: {
        transformation: "preset",
        transformationPreset: "thumbnail",
        artifact: "/foo",
        cachePermanently: false
      }
    });
    const expected = "https://upcdn.io/1234abc/thumbnail/example.jpg?cache_perm=false&artifact=%2Ffoo";
    expect(actual).toEqual(expected);
  });

  test("transformation API without params", () => {
    const actual = UrlBuilder.url({
      accountId: "1234abc",
      filePath: "/example.jpg",
      options: {
        transformation: "image"
      }
    });
    const expected = "https://upcdn.io/1234abc/image/example.jpg";
    expect(actual).toEqual(expected);
  });

  test("transformation API with one param", () => {
    const actual = UrlBuilder.url({
      accountId: "1234abc",
      filePath: "/example.jpg",
      options: {
        transformation: "image",
        transformationParams: {
          w: 42
        }
      }
    });
    const expected = "https://upcdn.io/1234abc/image/example.jpg?w=42";
    expect(actual).toEqual(expected);
  });

  test("transformation API with a mix of params", () => {
    const actual = UrlBuilder.url({
      accountId: "1234abc",
      filePath: "/example.jpg",
      options: {
        transformation: "image",
        transformationParams: {
          w: 42,
          h: 50
        },
        cachePermanently: "auto",
        artifact: "/foo",
        version: "50",
        auth: true
      }
    });
    const expected = "https://upcdn.io/1234abc/image/example.jpg?w=42&h=50&version=50&cache_perm=auto&artifact=%2Ffoo";
    expect(actual).toEqual(expected);
  });

  test("elide null and undefined", () => {
    const actual = UrlBuilder.url({
      accountId: "1234abc",
      filePath: "/example.jpg",
      options: {
        transformation: "image",
        transformationParams: {
          w: undefined,
          h: null,
          r: 52
        },
        auth: true
      }
    });
    const expected = "https://upcdn.io/1234abc/image/example.jpg?r=52";
    expect(actual).toEqual(expected);
  });

  // In the future, after we release our new domain structure (byte.cm), we will offer these 2 params:
  // - subdomain
  // - domain
  // If the user specifies either of these, we use the new syntax, which excludes the account ID prefix.
  // We will also automatically use their default subdomain (which is a function of their account ID) if unspecified.
  // This means customers on legacy custom CNAMEs are not (and will not) be supported by the UrlBuilder.
  // test("custom CNAME", () => {
  //   const actual = new UrlBuilder({ cdnUrl: "https://example.com" }).url({
  //     accountId: "1234abc",
  //     filePath: "/example.jpg",
  //     options: {
  //       transformation: "image",
  //       transformationParams: {
  //         w: 42,
  //         h: 50
  //       }
  //     }
  //   });
  //   const expected = "https://example.com/1234abc/image/example.jpg?w=42&h=50";
  //   expect(actual).toEqual(expected);
  // });
});
