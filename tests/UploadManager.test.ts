import { BytescaleApiClientConfig, FileApi, UploadManager } from "../src/index.node";
import fetch from "node-fetch";
import * as buffer from "buffer";
import { createRandomStreamFactory } from "./utils/RandomStream";
import { streamToBuffer } from "./utils/StreamToBuffer";
import { promises as fsAsync } from "fs";
import { prepareTempDirectory } from "./utils/TempUtils";
import * as Path from "path";

if (process.env.BYTESCALE_SECRET_API_KEY === undefined) {
  throw new Error("Expected env var: BYTESCALE_SECRET_API_KEY");
}
if (process.env.BYTESCALE_ACCOUNT_ID === undefined) {
  throw new Error("Expected env var: BYTESCALE_ACCOUNT_ID");
}
const accountId = process.env.BYTESCALE_ACCOUNT_ID;

const configuration: BytescaleApiClientConfig = {
  fetchApi: fetch as any,
  apiKey: process.env.BYTESCALE_SECRET_API_KEY // e.g. "secret_xxxxx"
};

const uploadManager = new UploadManager(configuration);
const fileApi = new FileApi(configuration);
const largeFileSize = Math.pow(1024, 2) * 500; // 500MB

async function testStreamingUpload(expectedSize: number): Promise<void> {
  const expectedData = await createRandomStreamFactory(expectedSize);
  const uploadedFile = await uploadManager.upload({
    data: expectedData(),
    size: expectedSize
  });
  const fileDetails = await fileApi.getFileDetails({ accountId, filePath: uploadedFile.filePath });
  const actualData = (await fileApi.downloadFile({ accountId, filePath: uploadedFile.filePath })).stream();
  const expectedDataBuffer = await streamToBuffer(expectedData());
  const actualDataBuffer = await streamToBuffer(actualData as any);
  const buffersEqual = Buffer.compare(expectedDataBuffer, actualDataBuffer) === 0;
  const actualSize = fileDetails.size;

  expect(actualSize).toEqual(expectedSize);
  expect(actualDataBuffer.length).toEqual(expectedDataBuffer.length);
  expect(actualDataBuffer.byteLength).toEqual(expectedDataBuffer.byteLength);

  if (!buffersEqual) {
    const dir = await prepareTempDirectory();
    await fsAsync.writeFile(Path.join(dir, "expected.txt"), expectedDataBuffer);
    await fsAsync.writeFile(Path.join(dir, "actual.txt"), actualDataBuffer);
  }

  expect(buffersEqual).toEqual(true);
}

describe("UploadManager", () => {
  test("upload an empty string", async () => {
    const expectedData = "";
    const expectedSize = 0;
    const uploadedFile = await uploadManager.upload({
      data: expectedData
    });
    const fileDetails = await fileApi.getFileDetails({ accountId, filePath: uploadedFile.filePath });
    const actualData = await (await fileApi.downloadFile({ accountId, filePath: uploadedFile.filePath })).text();
    const actualSize = fileDetails.size;
    expect(actualData).toEqual(expectedData);
    expect(actualSize).toEqual(expectedSize);
  });

  test("upload a string", async () => {
    const expectedData = "Example Data";
    const expectedMime = "text/plain";
    const uploadedFile = await uploadManager.upload({
      data: expectedData
    });
    const fileDetails = await fileApi.getFileDetails({ accountId, filePath: uploadedFile.filePath });
    const actualData = await (await fileApi.downloadFile({ accountId, filePath: uploadedFile.filePath })).text();
    const actualMime = fileDetails.mime;
    expect(actualData).toEqual(expectedData);
    expect(actualMime).toEqual(expectedMime);
  });

  test("upload a BLOB", async () => {
    const expectedData = JSON.stringify({ someValue: 42 });
    const expectedMime = "application/json";
    const uploadedFile = await uploadManager.upload({
      data: new buffer.Blob([expectedData], { type: expectedMime })
    });
    const fileDetails = await fileApi.getFileDetails({ accountId, filePath: uploadedFile.filePath });
    const actualData = await (await fileApi.downloadFile({ accountId, filePath: uploadedFile.filePath })).text();
    const actualMime = fileDetails.mime;
    expect(actualData).toEqual(expectedData);
    expect(actualMime).toEqual(expectedMime);
  });

  test("upload a buffer (override MIME)", async () => {
    const expectedData = "Example Data";
    const expectedMime = "text/plain";
    const uploadedFile = await uploadManager.upload({
      data: Buffer.from(expectedData, "utf8"),
      mime: expectedMime
    });
    const fileDetails = await fileApi.getFileDetails({ accountId, filePath: uploadedFile.filePath });
    const actualData = await (await fileApi.downloadFile({ accountId, filePath: uploadedFile.filePath })).text();
    const actualMime = fileDetails.mime;
    expect(actualData).toEqual(expectedData);
    expect(actualMime).toEqual(expectedMime);
  });

  test("upload a small buffer", async () => {
    const expectedData = "Example Data";
    const expectedMime = "application/octet-stream";
    const uploadedFile = await uploadManager.upload({
      data: Buffer.from(expectedData, "utf8")
    });
    const fileDetails = await fileApi.getFileDetails({ accountId, filePath: uploadedFile.filePath });
    const actualData = await (await fileApi.downloadFile({ accountId, filePath: uploadedFile.filePath })).text();
    const actualMime = fileDetails.mime;
    expect(actualData).toEqual(expectedData);
    expect(actualMime).toEqual(expectedMime);
  });

  test(
    "upload a large buffer",
    async () => {
      const expectedSize = largeFileSize;
      const expectedData = await streamToBuffer((await createRandomStreamFactory(expectedSize))());
      const uploadedFile = await uploadManager.upload({
        data: expectedData
      });
      const fileDetails = await fileApi.getFileDetails({ accountId, filePath: uploadedFile.filePath });
      const actualStream = (await fileApi.downloadFile({ accountId, filePath: uploadedFile.filePath })).stream();
      const actualData = await streamToBuffer(actualStream as any);
      const actualSize = fileDetails.size;
      const buffersEqual = Buffer.compare(expectedData, actualData) === 0;

      expect(actualSize).toEqual(expectedSize);
      expect(actualData.length).toEqual(expectedData.length);
      expect(actualData.byteLength).toEqual(expectedData.byteLength);
      expect(buffersEqual).toEqual(true);
    },
    10 * 60 * 1000
  );

  test(
    "upload a small stream",
    async () => {
      await testStreamingUpload(Math.pow(1024, 2) * 2); // 2MB
    },
    10 * 60 * 1000
  );

  test(
    "upload a large stream",
    async () => {
      await testStreamingUpload(largeFileSize); // 500MB
    },
    10 * 60 * 1000
  );
});
