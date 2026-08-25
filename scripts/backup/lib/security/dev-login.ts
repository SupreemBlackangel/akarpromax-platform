import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { ApiError } from "@/lib/errors/api-error";
import { logSecurityEvent } from "@/lib/security/audit";

// Path used by the reference app's dev login backdoor. The target app has NO
// dev-login route today; this guard exists so that any future/mock login
// bypass is rejected unless explicitly enabled in a development build.
export const DEV_LOGIN_ROUTE_PATH = "/dev-login";

export function devLoginEnabled(): boolean {
  const env = getRuntimeEnv();
  return env.nodeEnv === "development" && process.env.ENABLE_DEV_LOGIN === "true";
}

export function assertDevLoginAllowed(): void {
  if (devLoginEnabled()) return;
  logSecurityEvent("AUTH_DEV_LOGIN_BLOCKED", {});
  throw new ApiError(403, "dev_login_disabled", "AUTH_DEV_LOGIN_BLOCKED");
}
