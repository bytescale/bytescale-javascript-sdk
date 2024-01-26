import {
  KeyValuePair,
  NonDeprecatedCommonQueryParams,
  UrlBuilderOptions,
  UrlBuilderOptionsTransformationOnly,
  UrlBuilderParams,
  UrlBuilderTransformationApiOptions,
  UrlBuilderTransformationOptions
} from "./UrlBuilderTypes";
import { BytescaleApiClientConfigUtils, encodeBytescaleQuerystringKVP } from "./generated";
import { isDefinedEntry } from "../../private/TypeUtils";

export class UrlBuilder {
  /**
   * Builds a URL to either a raw file or a transformed file.
   *
   * Example 1) Getting a publicly-accessible raw file URL:
   *
   *   new UrlBuilder().url({ accountId: "1234abc", filePath: "/example.jpg" })
   *
   * Example 2) Getting a publicly-accessible image URL, resized to 500x500:
   *
   *   new UrlBuilder().url({ accountId: "1234abc", filePath: "/example.jpg", options: { transformation: { type: "image", params: { w: 500, h: 500, fit: "crop" } } } })
   *
   * Example 3) Getting a privately-accessible image URL, resized to 500x500 (requires 'AuthManager.beginAuthSession' to be called before accessing the URL):
   *
   *   new UrlBuilder().url({ accountId: "1234abc", filePath: "/example.jpg", options: { transformation: { type: "image", params: { w: 500, h: 500, fit: "crop" } }, auth: true } })
   *
   * Example 4) Getting a publicly-accessible image URL, resized using a transformation preset called "thumbnail" that was created manually in the Bytescale Dashboard:
   *
   *   new UrlBuilder().url({ accountId: "1234abc", filePath: "/example.jpg", options: { transformation: { type: "preset", preset: "thumbnail" } } })
   */
  static url(params: UrlBuilderParams): string {
    return params.options?.transformation === undefined
      ? this.raw(params)
      : this.transformation(params, params.options);
  }

  private static raw(params: UrlBuilderParams): string {
    const baseUrl = this.getBaseUrl(params, "raw");
    const commonParams = this.getCommonQueryParams(params.options ?? {});
    return this.addQueryParams(baseUrl, commonParams);
  }

  private static transformation(params: UrlBuilderParams, trans: UrlBuilderTransformationOptions): string {
    const baseUrl = this.getBaseUrl(
      params,
      trans.transformation === "preset" ? trans.transformationPreset : trans.transformation
    );
    const transParams = trans.transformation === "preset" ? [] : this.getTransformationParams(trans);
    const commonParams = this.getCommonQueryParams(params.options ?? {});
    const transCommonParams = this.getCommonTransformationQueryParams(trans);

    // This format puts "artifact" at the end, which isn't required, but is convention.
    return this.addQueryParams(baseUrl, [...transParams, ...commonParams, ...transCommonParams]);
  }

  private static getBaseUrl(params: UrlBuilderParams, prefix: string): string {
    const cdnUrl = params.options?.cdnUrl ?? BytescaleApiClientConfigUtils.defaultCdnUrl;
    const filePathEncoded = encodeURIComponent(params.filePath).replace(/%2F/g, "/");
    return `${cdnUrl}/${params.accountId}/${prefix}${filePathEncoded}`;
  }

  private static getCommonTransformationQueryParams(trans: UrlBuilderTransformationOptions): KeyValuePair[] {
    return this.makeQueryParams<keyof UrlBuilderOptionsTransformationOnly>(
      {
        cacheOnly: null,
        cachePermanently: null,
        // Keep this as the last param: this is the convention for transformation URLs (although not required).
        artifact: null
      },
      {
        cacheOnly: "cache_only",
        cachePermanently: "cache_perm"
      }
    )(trans);
  }

  private static getCommonQueryParams(params: UrlBuilderOptions): KeyValuePair[] {
    return this.makeQueryParams<keyof NonDeprecatedCommonQueryParams>(
      {
        cache: null,
        cacheTtl: null,
        version: null,
        forceDownloadPrompt: null
      },
      {
        cacheTtl: "cache_ttl",
        forceDownloadPrompt: "download"
      }
    )(params);
  }

  /**
   * Masks the querystring params per the 'keys' array.
   *
   * Order sensitive: querystring params will appear per the order of the 'keys' array.
   */
  private static makeQueryParams<T extends string>(
    keyPrototype: Record<T, null>,
    keyOverrides: Partial<Record<T, string>>
  ): (data: Partial<Record<T, string | number | boolean>>) => KeyValuePair[] {
    return data => {
      const result: KeyValuePair[] = [];
      const keys = Object.keys(keyPrototype) as T[];
      keys.forEach(key => {
        const value = data[key];
        if (value !== undefined) {
          result.push([keyOverrides[key] ?? key, value.toString()]);
        }
      });
      return result;
    };
  }

  private static getTransformationParams(trans: UrlBuilderTransformationApiOptions): KeyValuePair[] {
    const params = trans.transformationParams;
    if (params === undefined) {
      return [];
    }

    const serializeObj = (obj: any): KeyValuePair[] =>
      Object.entries(obj)
        .filter(isDefinedEntry)
        .map(([key, value]) => [key, (value as string | number | boolean).toString()]);

    return Array.isArray(params) ? params.flatMap(serializeObj) : serializeObj(params);
  }

  private static addQueryParams(baseUrl: string, params: KeyValuePair[]): string {
    if (params.length === 0) {
      return baseUrl;
    }
    return `${baseUrl}?${params.map(([key, value]) => encodeBytescaleQuerystringKVP(key, value)).join("&")}`;
  }
}
