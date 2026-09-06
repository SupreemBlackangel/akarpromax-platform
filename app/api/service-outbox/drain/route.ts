import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { processOutbox } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

/**
 * Send whatever is waiting in the services outbox.
 *
 * Publishing a request already kicks a drain, so this is the safety net rather
 * than the main path: it catches what that kick missed — a send that failed
 * while SMTP was down, an event written by a code path that does not kick, a
 * process restarted mid-batch. A cron on the server calls it every few minutes.
 *
 * Two ways in, and no third:
 *   - a signed-in admin holding SERVICE_REQUESTS_MANAGE_ALL, or
 *   - the server's own cron, with SERVICE_OUTBOX_SECRET in x-outbox-secret.
 *
 * With no secret configured the header route is closed rather than open: an
 * unset variable must never mean "anyone may drain the queue".
 */

function secretMatches(request: NextRequest): boolean {
  const expected = (process.env.SERVICE_OUTBOX_SECRET ?? "").trim();
  if (!expected) return false;
  const given = (request.headers.get("x-outbox-secret") ?? "").trim();
  if (given.length !== expected.length) return false;
  // Constant time over equal-length strings, so a wrong secret cannot be
  // guessed a character at a time from how long the answer took.
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: NextRequest) {
  let allowed = secretMatches(request);
  if (!allowed) {
    const identity = await getSessionIdentity();
    allowed = identity.authenticated && hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL);
  }
  if (!allowed) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
  const processed = await processOutbox(Number.isFinite(limit) ? limit : 50);
  return NextResponse.json({ ok: true, processed }, { headers: { "Cache-Control": "no-store" } });
}
