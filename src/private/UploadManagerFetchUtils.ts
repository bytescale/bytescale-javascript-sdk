import { BytescaleApiClientConfig, BytescaleApiClientConfigUtils, UploadPart } from "../public/shared";
import { AddCancellationHandler } from "./model/AddCancellationHandler";

export class UploadManagerFetchUtils {
  static async doPutUploadPart(
    config: BytescaleApiClientConfig,
    part: UploadPart,
    content: BodyInit,
    contentLength: number,
    addCancellationHandler: AddCancellationHandler
  ): Promise<{ etag: string | undefined; status: number }> {
    const fetchApi = BytescaleApiClientConfigUtils.getFetchApi(config);

    // Configure cancellation:
    const controller = new AbortController();
    const signal = controller.signal;
    addCancellationHandler(() => controller.abort());

    const headers: HeadersInit = {
      // Required to prevent fetch using "Transfer-Encoding: Chunked" when body is a stream.
      "content-length": contentLength.toString()
    };

    const response = await fetchApi(part.uploadUrl, {
      method: "PUT",
      headers,
      body: content,
      signal,
      duplex: "half",
      cache: "no-store" // Required for Next.js's Fetch implementation, which caches POST/PUT requests by default.
    });

    return {
      etag: response.headers.get("etag") ?? undefined,
      status: response.status
    };
  }
}
