import { UploadedFile } from "upload-js/UploadedFile";
import { FileLike } from "upload-js/FileLike";
import { UploadParams } from "upload-js/UploadParams";
import { UrlParams } from "upload-js/UrlParams";

export interface UploadInterface {
  /**
   * Call after a user has signed-in to your web app.
   *
   * Allows the user to perform authenticated uploads and/or downloads to the Upload CDN.
   *
   * You must await the promise before attempting to perform any uploads or downloads that require authentication.
   *
   * Method safety:
   * - IS idempotent: you may call this method multiple times, contiguously. (The previous auth session will be ended.)
   * - IS reentrant: can be called before another *AuthSession method has finished executing.
   *
   * @param authUrl The fully-qualified URL for your backend API's auth endpoint.
   * @param authHeaders Headers to send to your backend API.
   *                    IMPORTANT: do not call '*AuthSession' inside this callback, as this will cause a deadlock.
   */
  beginAuthSession: (authUrl: string, authHeaders: () => Promise<Record<string, string>>) => Promise<void>;

  /**
   * Call after the user signs-out of your web app.
   *
   * Method safety:
   * - IS idempotent: you may call this method multiple times, contiguously.
   * - IS reentrant: can be called before another *AuthSession method has finished executing
   */
  endAuthSession: () => Promise<void>;

  uploadFile: (file: FileLike, params?: UploadParams) => Promise<UploadedFile>;

  url: (filePath: string, transformationOrParams?: string | UrlParams) => string;
}
