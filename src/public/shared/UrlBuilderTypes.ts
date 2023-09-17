/**
 * Workaround for tsc aliases, where we cannot export implementation-less modules in our dists.
 */
export const UrlBuilderTypesNoOp = false;

export type ParameterGroup = Record<string, string | number | boolean | undefined | null>;

export type KeyValuePair = [string, string];

export interface UrlBuilderParams {
  /**
   * The account that manages the file.
   */
  accountId: string;

  /**
   * The file to download.
   *
   * Must begin with: "/"
   */
  filePath: string;

  /**
   * Optional parameters to control how the URL is constructed.
   */
  options?: UrlBuilderOptions;
}

export type UrlBuilderOptions = UrlBuilderOptionsRaw | UrlBuilderTransformationOptions;

export type UrlBuilderTransformationOptions = UrlBuilderTransformationApiOptions | UrlBuilderOptionsPreset;

export type UrlBuilderTransformationApiOptions =
  | UrlBuilderOptionsImage
  | UrlBuilderOptionsVideo
  | UrlBuilderOptionsAudio
  | UrlBuilderOptionsArchive;

export interface UrlBuilderOptionsBase {
  /**
   * Set to 'true' to download a private file. Requires an active auth session. See AuthManager.beginAuthSession.
   *
   * Set to 'false' or omit when downloading publicly-accessible files.
   *
   * Default: false
   */
  auth?: boolean;

  /**
   * Specifies whether to use caching for this request, or to always re-request the file.
   *
   * For file transformations, setting 'true' will cause the file to be re-processed on every request.
   *
   * Default: false
   */
  cache?: boolean;

  /**
   * Specifies the maximum amount of time, in seconds, the file will be cached on the user's device and in the Bytescale CDN's edge cache.
   *
   * Default: Please refer to your account's default cache settings in the Bytescale Dashboard.
   */
  cacheTtl?: number;

  /**
   * Forces the browser to display a download prompt for the file, instead of displaying the file in the browser.
   *
   * When set to true, the Bytescale CDN will add a 'content-disposition: attachment' header to the HTTP response.
   *
   * Default: false
   */
  forceDownloadPrompt?: boolean;

  /**
   * Downloads the latest version of your file (if you have overwritten it) when added to the URL with a unique value.
   *
   * The value of the version parameter can be anything, e.g. an incremental number, a timestamp, etc.
   *
   * You only need to provide and update this value if/when you overwrite your file.
   */
  version?: string;
}

export interface UrlBuilderOptionsRaw extends UrlBuilderOptionsBase {
  transformation?: undefined;
}

export interface UrlBuilderOptionsImage extends UrlBuilderOptionsTransformationApi<ParameterGroup> {
  /**
   * Set to "image" to use Bytescale's Image Processing API:
   *
   * https://www.bytescale.com/docs/image-processing-api
   */
  transformation: "image";
}

export interface UrlBuilderOptionsVideo extends UrlBuilderOptionsTransformationApi<ParameterGroup> {
  /**
   * Set to "video" to use Bytescale's Video Processing API:
   *
   * https://www.bytescale.com/docs/video-processing-api
   */
  transformation: "video";
}

export interface UrlBuilderOptionsAudio extends UrlBuilderOptionsTransformationApi<ParameterGroup> {
  /**
   * Set to "audio" to use Bytescale's Audio Processing API:
   *
   * https://www.bytescale.com/docs/audio-processing-api
   */
  transformation: "audio";
}

export interface UrlBuilderOptionsArchive extends UrlBuilderOptionsTransformationApi<ParameterGroup> {
  /**
   * Set to "archive" to use Bytescale's Archive Processing API:
   *
   * https://www.bytescale.com/docs/archive-processing-api
   */
  transformation: "archive";
}

export interface UrlBuilderOptionsPreset extends UrlBuilderOptionsTransformation {
  transformation: "preset";

  /**
   * The name of the transformation preset, as displayed in the Bytescale Dashboard.
   *
   * To specify transformation parameters on-the-fly, set "transformation" to a File Processing API (e.g. "image", "video", "audio"), and then use the "transformationParams" field to pass parameters to the File Processing API.
   */
  transformationPreset: string;
}

export interface UrlBuilderOptionsTransformationApi<T> extends UrlBuilderOptionsTransformation {
  /**
   * Use the "transformationParams" field to pass parameters to the File Processing API.
   *
   * Use the "transformation" field to specify which File Processing API to use:
   *
   * - https://www.bytescale.com/docs/image-processing-api
   * - https://www.bytescale.com/docs/video-processing-api
   * - https://www.bytescale.com/docs/audio-processing-api
   * - https://www.bytescale.com/docs/archive-processing-api
   *
   * To repeat a parameter (e.g. when adding multiple text layers to an image), use an array instead of an object, e.g.
   *
   *    [ { text: "hello" }, { text: "world" } ]
   *
   * Order is sensitive both within and across parameter groups for certain transformation operations, please consult
   * the documentation for the File Processing API you are using (see links above).
   */
  transformationParams?: T | T[];
}

export interface UrlBuilderOptionsTransformation extends UrlBuilderOptionsBase {
  /**
   * The transformation artifact to download.
   *
   * Some transformations produce multiple files. The 'artifact' parameter is used to select which file to download.
   *
   * Must begin with: "/"
   *
   * Default: "/"
   */
  artifact?: string;

  /**
   * Specifies whether to permanently cache the transformed result in the Bytescale CDN.
   *
   * Permanently cached files can be deleted via a manual action in the Bytescale Dashboard.
   *
   * When cache=false this parameter is automatically set to false.
   *
   * When cachePermanently="auto" the permanent cache will only be used for files that take more than 1000ms to process.
   *
   * When the permanent cache is used, approximately 200ms of latency is added to the initial request. Thereafter, files will be served from the Bytescale CDN's edge cache or permanent cache, so will have minimal latency.
   *
   * Default: Please refer to your account's default cache settings in the Bytescale Dashboard.
   */
  cachePermanently?: "auto" | boolean;

  /**
   * Only set this parameter to `true` if you expect the HTTP response body for the transformation request to be over 6MB.
   *
   * We recommend leaving this parameter unset (so it defaults to `false`) and controlling the HTTP response body size via transformation parameters. E.g. for Image Processing API requests, you can shrink the HTTP response body by reducing the output image's dimensions and/or quality.
   *
   * Setting this parameter to `true` will route the request via an alternative CDN path, which allows responses over 6MB, but incurs a ~200ms latency on all CDN edge cache misses for the URL.
   *
   * Setting this parameter to `false` (default) results in faster routing. If a response over 6MB is returned, the initial response will be a JSON error indicating the response was too large to return. All subsequent requests to the same URL will successfully return the transformed file (forever).
   *
   * Default: false
   */
  large?: boolean;
}
