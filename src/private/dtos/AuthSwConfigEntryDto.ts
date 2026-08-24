import { AuthSwHeaderDto } from "./AuthSwHeaderDto";

export interface AuthSwConfigEntryDto {
  expires: number | undefined;
  headers: AuthSwHeaderDto[];
  sourceUrlPrefixes?: string[];
  urlPrefix: string;
}
