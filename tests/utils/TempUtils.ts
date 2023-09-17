import { promises as fsAsync } from "fs";
import * as Path from "path";

export async function prepareTempDirectory(): Promise<string> {
  const folder = Path.resolve(`tmp/${Date.now()}`);
  await fsAsync.rm(folder, { recursive: true, force: true });
  await fsAsync.mkdir(folder, { recursive: true });
  return folder;
}
