import { AuthSessionConfigAuto } from "./AuthSessionConfigAuto";
import { AuthSessionConfigManual } from "./AuthSessionConfigManual";

export type AuthSessionConfig = AuthSessionConfigAuto | AuthSessionConfigManual;
