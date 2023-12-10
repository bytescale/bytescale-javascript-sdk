import { AuthSwHeaderDto } from "./AuthSwHeaderDto";

export interface AuthSwConfigEntryDto {
  expires: number | undefined;
  headers: AuthSwHeaderDto[];
  urlPrefix: string;
}
