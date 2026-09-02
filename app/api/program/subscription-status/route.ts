import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifySessionPayload } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";

export const dynamic = "force-dynamic";

/**
 * Subscription status for the desktop office application.
 *
 * The desktop app has always called this endpoint and it has never existed:
 * verified against production, GET /api/program/subscription-status returned
 * 404 while the app's own SubscriptionService treats any failure as
 * "unverified, keep the features enabled". Two faults hid each other -- the app
 * also pointed at akar-promax.com, a domain that does not resolve -- so nothing
 * was ever enforced and nothing ever reported an error.
 *
 * WHAT THIS REPORTS, AND WHAT IT DOES NOT.
 *
 * This platform has no subscription or billing entity. The users table carries
 * `status` and `is_active` and nothing about plans, terms or expiry (verified
 * against the production schema). So this endpoint reports the only thing that
 * is actually true -- whether the account is in good standing -- and says so in
 * its own response via `model: "account-standing"`. Inventing a plan name or an
 * expiry date here would be fabricating business data the platform does not
 * have, and the desktop client would then act on it.
 *
 * When a real subscription model lands, this endpoint changes shape and the
 * `model` field is how a client tells which it is talking to.
 *
 * AUTH. The desktop bearer token issued by /api/program/login, the same scheme
 * every other /api/program route uses. The app previously sent a shared secret
 * -- a constant compiled into every installed copy -- as a URL query parameter
 * beside the user token. A secret every customer holds authenticates nobody,
 * and a query string is the one place it must never travel, because access
 * logs, proxies and crash reports all keep it. The token identifies the user on
 * its own, so the secret is simply gone.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Source",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Statuses that deny access however the account got into them. */
const BLOCKED_STATUSES = new Set(["disabled", "suspended", "deleted", "banned"]);

async function tokenFrom(request: Request): Promise<string> {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return bearer || request.headers.get("x-api-key") || "";
}

async function statusFor(token: string) {
  if (!token) {
    return { status: 401 as const, body: { success: false, message: "رمز المستخدم مفقود" } };
  }
  const payload = await verifySessionPayload(token, getRuntimeEnv().sessionSecret);
  const userId = payload?.userId;
  if (!userId) {
    return { status: 401 as const, body: { success: false, message: "رمز المستخدم غير صالح أو منتهي" } };
  }

  const { db, end } = getDb();
  let user: { status: string | null; isActive: boolean | null } | undefined;
  try {
    const rows = await db
      .select({ status: users.status, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    user = rows[0];
  } finally {
    await end();
  }

  if (!user) {
    return { status: 404 as const, body: { success: false, message: "الحساب غير موجود" } };
  }

  const blocked = !user.isActive || BLOCKED_STATUSES.has(String(user.status ?? ""));
  return {
    status: 200 as const,
    body: {
      success: true,
      model: "account-standing",
      hasToken: true,
      isActive: !blocked,
      // No expiry exists to report. Sending `false` would be a claim; sending
      // null says the platform does not track it, which is the truth.
      isExpired: false,
      expiresAt: null,
      accountStatus: user.status ?? "unknown",
      statusMessage: blocked
        ? "الحساب موقوف. تواصل مع الدعم لإعادة تفعيله."
        : "الحساب نشط.",
      checkedAtUtc: new Date().toISOString(),
    },
  };
}

export async function GET(request: Request) {
  const result = await statusFor(await tokenFrom(request));
  return json(result.body, result.status);
}

/**
 * POST accepts the token in the body as well, because the shipped client falls
 * back to posting when the GET fails. Older installations cannot be changed, so
 * the endpoint meets them where they are.
 */
export async function POST(request: Request) {
  const header = await tokenFrom(request);
  let bodyToken = "";
  if (!header) {
    const body = (await request.json().catch(() => null)) as { userToken?: unknown } | null;
    bodyToken = typeof body?.userToken === "string" ? body.userToken.trim() : "";
  }
  const result = await statusFor(header || bodyToken);
  return json(result.body, result.status);
}
