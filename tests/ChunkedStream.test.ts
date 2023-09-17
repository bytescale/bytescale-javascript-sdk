import { NodeChunkedStream } from "../src/private/NodeChunkedStream";
import { createRandomStreamFactory } from "./utils/RandomStream";
import { streamToBuffer } from "./utils/StreamToBuffer";

describe("ChunkedStream", () => {
  test(
    "forward the entire stream",
    async () => {
      const expectedSize = Math.pow(1024, 2) * 100; // 100MB
      const maxPartSize = Math.pow(1024, 2) * 2; // 2MB
      const expectedData = await createRandomStreamFactory(expectedSize);
      const chunkedStream = new NodeChunkedStream(expectedData());
      const worker = chunkedStream.runChunkPipeline();
      let remaining = expectedSize;
      const buffersFromParts = Array<Buffer>();

      while (remaining > 0) {
        const nextPartSize = (): number => {
          const next = Math.min(remaining, Math.round(Math.random() * maxPartSize) + 1);
          remaining -= next;
          return next;
        };

        const partSize = nextPartSize();

        const subStream = chunkedStream.take(partSize);
        const subStreamBuffer = await streamToBuffer(subStream);

        expect(subStreamBuffer.byteLength).toEqual(partSize);
        expect(subStreamBuffer.length).toEqual(partSize);

        buffersFromParts.push(subStreamBuffer);
      }

      chunkedStream.finishedConsuming();
      await worker;

      const actual = Buffer.concat(buffersFromParts);
      const expected = await streamToBuffer(expectedData());

      const buffersEqual = Buffer.compare(expected, actual) === 0;

      expect(actual.length).toEqual(expected.length);
      expect(actual.byteLength).toEqual(expected.byteLength);
      expect(buffersEqual).toEqual(true);
    },
    10 * 60 * 1000
  );
});
