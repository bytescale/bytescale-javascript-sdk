export class EnvChecker {
  static isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  static methodRequiresBrowser(methodName: string): Error {
    if (!EnvChecker.isBrowser()) {
      return new Error(
        `You must call '${methodName}' in your client-side code. (You have called it in your server-side code.)`
      );
    }

    return new Error(
      `The '${methodName}' method cannot be called because you have bundled a non-browser implementation of the Bytescale JavaScript SDK into your client-side code. Please ensure your bundling tool (Webpack, Rollup, etc.) is honouring the "browser" field of the "package.json" file for this package, as this will allow the browser implementation of the Bytescale JavaScript SDK to be included in your client-side code.`
    );
  }
}
