import { AuthSwHeaderDto } from "./AuthSwHeaderDto";

export interface AuthSwConfigEntryDto {
  /** Epoch time in milliseconds. Omit the value to keep the entry until the config is replaced. */
  expires: number | undefined;

  /** Headers to add to matching requests. */
  headers: AuthSwHeaderDto[];

  /** Optional page or iframe URL prefixes. An empty array matches no clients. */
  sourceUrlPrefixes?: string[];

  /** Request URL prefix. Use the actual URL; AuthManager applies any internal compatibility marker. */
  urlPrefix: string;
}
