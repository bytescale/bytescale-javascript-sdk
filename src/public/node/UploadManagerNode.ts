import { UploadManagerBase } from "../../private/UploadManagerBase";
import { UploadSourceProcessedNode } from "../../private/model/UploadSourceProcessed";
import { NodeChunkedStream } from "../../private/NodeChunkedStream";
import { PreUploadInfo } from "../../private/model/PreUploadInfo";
import { UploadPart } from "../shared/generated";
import { assertUnreachable } from "../../private/TypeUtils";
import { Blob } from "buffer";
import { AddCancellationHandler } from "../../private/model/AddCancellationHandler";
import { StreamUtils } from "../../private/StreamUtils";
import { BlobLike, UploadManagerParams, UploadSource } from "../shared/CommonTypes";
import { UploadManagerFetchUtils } from "../../private/UploadManagerFetchUtils";
import { ProgressStream } from "./ProgressStream";

type UploadManagerNodeInit =
  | undefined
  | {
      chunkedStream: NodeChunkedStream;
      chunkedStreamPromise: Promise<void>;
    };

export class UploadManager extends UploadManagerBase<UploadSourceProcessedNode, UploadManagerNodeInit> {
  protected processUploadSource(data: UploadSource): UploadSourceProcessedNode {
    if (typeof data === "string") {
      // 'Blob' must be from 'buffer' as we're in a node context here, so isn't globally available.
      return { type: "Blob", value: new Blob([data], { type: this.stringMimeType }) };
    }
    if ((data as Partial<NodeJS.ReadableStream>).on !== undefined) {
      return { type: "Stream", value: new NodeChunkedStream(data as NodeJS.ReadableStream) };
    }
    if ((data as Partial<Buffer>).subarray !== undefined) {
      return { type: "Buffer", value: data as Buffer };
    }
    if ((data as Partial<ArrayBuffer>).byteLength !== undefined) {
      return { type: "ArrayBuffer", value: data as ArrayBuffer };
    }
    if ((data as Partial<BlobLike>).size !== undefined) {
      return { type: "Blob", value: data as BlobLike };
    }

    throw new Error(
      `Unsupported type for 'data' parameter. Please provide a String, Blob, Buffer, ArrayBuffer, or ReadableStream (Node.js).`
    );
  }

  protected getPreUploadInfoPartial(
    request: UploadManagerParams,
    data: UploadSourceProcessedNode
  ): Partial<PreUploadInfo> & { size: number } {
    switch (data.type) {
      case "Blob":
        return this.getBlobInfo(data);
      case "Buffer":
      case "ArrayBuffer":
        return {
          mime: undefined,
          size: data.value.byteLength,
          originalFileName: undefined,
          maxConcurrentUploadParts: undefined
        };
      case "Stream":
        if (request.size === undefined) {
          throw new Error("You must include the 'size' parameter when using a stream for the 'data' parameter.");
        }
        return {
          mime: undefined,
          size: request.size,
          originalFileName: undefined,
          maxConcurrentUploadParts: 1 // Uploading from a stream concurrently is complex, so we serialize it.
        };
      default:
        assertUnreachable(data);
    }
  }

  protected preUpload(source: UploadSourceProcessedNode): UploadManagerNodeInit {
    if (source.type !== "Stream") {
      return undefined;
    }

    const chunkedStream = source.value;
    const chunkedStreamPromise = chunkedStream.runChunkPipeline();
    return { chunkedStreamPromise, chunkedStream };
  }

  protected async postUpload(init: UploadManagerNodeInit): Promise<void> {
    if (init === undefined) {
      return;
    }

    init.chunkedStream.finishedConsuming();

    // Raise any errors from the stream chunking task.
    await init.chunkedStreamPromise;
  }

  protected async doPutUploadPart(
    part: UploadPart,
    contentLength: number,
    source: UploadSourceProcessedNode,
    onProgress: (totalBytesTransferred: number) => void,
    addCancellationHandler: AddCancellationHandler
  ): Promise<{ etag: string | undefined; status: number }> {
    const inputStream = await this.sliceDataForRequest(source, part);
    const progressStream = new ProgressStream({ onProgress });
    inputStream.pipe(progressStream);

    return await UploadManagerFetchUtils.doPutUploadPart(
      this.config,
      part,
      this.coerceRequestBody(progressStream),
      contentLength,
      addCancellationHandler
    );
  }

  private coerceRequestBody(data: NodeJS.ReadableStream): BodyInit {
    return data as any; // node-fetch supports 'NodeJS.ReadableStream'
  }

  private async sliceDataForRequest(data: UploadSourceProcessedNode, part: UploadPart): Promise<NodeJS.ReadableStream> {
    if (part.range.inclusiveEnd === -1) {
      return StreamUtils.empty();
    }

    const start = part.range.inclusiveStart;
    const endExclusive = part.range.inclusiveEnd + 1;
    const partSize = endExclusive - start;

    switch (data.type) {
      case "Blob":
        return StreamUtils.fromArrayBuffer(await (data.value.slice(start, endExclusive) as Blob).arrayBuffer());
      case "ArrayBuffer":
        return StreamUtils.fromArrayBuffer(data.value.slice(start, endExclusive));
      case "Buffer":
        return StreamUtils.fromBuffer(data.value.subarray(start, endExclusive));
      case "Stream":
        return data.value.take(partSize); // Assumes stream is read using one worker (which it is).
      default:
        assertUnreachable(data);
    }
  }
}
