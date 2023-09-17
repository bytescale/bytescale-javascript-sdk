// import randomGen from "random-seed";
import { Readable } from "stream";
import fs, { promises as fsAsync } from "fs";
import { prepareTempDirectory } from "./TempUtils";
import * as Path from "path";

/**
 * IMPORTANT:
 * It's difficult to efficiently create a pseudorandom stream, since 'read' may be called a different number of times
 * (i.e. with different read sizes) across two streams, so if the implementation updates the entrophy based on these
 * read calls, it will produce two different results for the streams.
 *
 * As such, we create a random stream, save to file, then stream from the file.
 */
function createRandomStream(sizeInBytes: number): NodeJS.ReadableStream {
  const dictionary = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");

  let producedSize = 0;
  let iteration = 0;
  return new Readable({
    read(readSize) {
      let shouldEnd = false;

      if (producedSize + readSize >= sizeInBytes) {
        readSize = sizeInBytes - producedSize;
        shouldEnd = true;
      }

      const character = dictionary[iteration % dictionary.length];
      const prefix = `${iteration}`.padEnd(10);

      iteration++;
      producedSize += readSize;

      if (readSize > prefix.length + 2) {
        // Makes debugging a little easier, if we need to read the files.
        this.push(Buffer.from(prefix));
        this.push(Buffer.alloc(readSize - (prefix.length + 1), character));
        this.push(Buffer.alloc(1, "\n"));
      } else {
        this.push(Buffer.alloc(readSize, character));
      }

      if (shouldEnd) {
        this.push(null);
      }
    }
  });
}

async function writeToDisk(reader: NodeJS.ReadableStream, path: string): Promise<void> {
  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(path);
    writer.on("close", resolve);
    writer.on("error", reject);
    reader.pipe(writer);
  });
}

/**
 * Creates a method that will return a stream that holds the exact same (random) data each time.
 * @param sizeInBytes
 */
export async function createRandomStreamFactory(sizeInBytes: number): Promise<() => NodeJS.ReadableStream> {
  const dir = await prepareTempDirectory();
  const file = Path.join(dir, "random.txt");

  await writeToDisk(createRandomStream(sizeInBytes), file);

  const fileInfo = await fsAsync.stat(file);
  if (fileInfo.size !== sizeInBytes) {
    throw new Error("Created a random source file with incorrect size!");
  }

  return () => fs.createReadStream(file);
}
