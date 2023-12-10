import { AuthSwConfigDto } from "./AuthSwConfigDto";

export interface AuthSwSetConfigDto {
  config: AuthSwConfigDto;
  type: "SET_CONFIG";
}
