import { NextResponse } from "next/server";
import { clientIp, enforceRateLimit, type RateLimitOperation } from "@/lib/security/rate-limit";

/**
 * Rate limiting for the services marketplace.
 *
 * It had none. Sixty-four routes, no limits anywhere, while the advertising
 * surface next door was rate limited. The public provider directory runs geo
 * queries for anonymous callers, and the authenticated write endpoints create
 * rows that other people see and that moderators have to deal with.
 *
 * A helper rather than the raw call at every site, so that adding a limit is
 * one line and the 429 always carries a Retry-After -- a limiter that does not
 * tell a client when to come back turns a burst into a retry storm.
 */
export async function limitOr429(
  request: Request,
  operation: RateLimitOperation,
  identifier?: string,
): Promise<NextResponse | null> {
  const result = await enforceRateLimit(operation, clientIp(request), identifier);
  if (result.allowed) {
    return null;
  }
  return NextResponse.json(
    { error: "TOO_MANY_REQUESTS", message: "محاولات كثيرة، حاول بعد قليل." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds), "Cache-Control": "no-store" } },
  );
}
