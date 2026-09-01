export interface UrlRewriteRule {
  /** URL prefix to replace. This URL must be covered by the service worker's origin and scope. */
  fromUrlPrefix: string;

  /** Replacement URL prefix. The remainder of the original URL is appended unchanged. */
  toUrlPrefix: string;
}
