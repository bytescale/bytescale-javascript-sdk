export class FilePathUtils {
  static encodeFilePath(filePath: string): string {
    // To convert a Bytescale File Path into a Bytescale File URL:
    // a) Call encodeURIComponent() on the file path. (This allows file paths to contain ANY character.)
    // b) Replace all occurrences of "%2F" with "/". (Allows file paths to appear as hierarchical paths on the URL.)
    // c) Replace all occurrences of "!" with "%21". (Prevents file paths with "!" inside being treated as "query bangs".)
    // SYNC: FileUrlUtils.makeFileUrl (internal)
    return encodeURIComponent(filePath).replace(/%2F/g, "/").replace(/!/g, "%21");
  }
}
