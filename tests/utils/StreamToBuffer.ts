export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const buffers = Array<Buffer>();
    stream.on("data", chunk => buffers.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(buffers)));
    stream.on("error", err => reject(err));
  });
}
