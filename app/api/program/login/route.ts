import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionPayload } from "@/lib/auth/session";
import { mapSessionRole, permissionsForSessionRole } from "@/lib/auth/identity-map";
import { isAccountUsable } from "@/lib/auth/access-control";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { normalizeEmailIdentity } from "@/lib/auth/email-identity";
import { clientIp, enforceRateLimit, normalizeEmail } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Desktop-app login bridge.
 *
 * The AkarProMax Office desktop app (its WebView, origin https://akarapp.local)
 * posts the user's real platform credentials here. On success it receives a
 * signed bearer token the desktop stores as `user_token` / the API-settings
 * apiKey; the C# bridge captures it automatically. This is the "automatic
 * login" — the account itself is the key, no manual token pasting.
 *
 * The token is a normal signed session payload (HS256, same secret as web
 * sessions) with a `desktop` marker and a 30-day lifetime, so the office
 * device endpoints can verify it without a separate credential store.
 *
 * CORS is permissive because the caller is the WebView's akarapp.local origin;
 * credentials still gate every response.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const DESKTOP_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

type LoginBody = { identifier?: unknown; email?: unknown; phone?: unknown; password?: unknown };

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  // Boot-time production env validation (session secret, etc.).
  getRuntimeEnv();

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return json({ success: false, message: "طلب غير صالح" }, 400);
  }

  const rawIdentifier = clean(body.identifier, 160);
  const looksLikeEmail = rawIdentifier.includes("@");
  const email = normalizeEmailIdentity(clean(body.email, 160) || (looksLikeEmail ? rawIdentifier : ""));
  const phone = clean(body.phone, 20) || (!looksLikeEmail ? rawIdentifier : "");
  const password = typeof body.password === "string" ? body.password : "";
  const identifier = email || phone;

  if (!identifier || !password) {
    return json({ success: false, message: "أدخل البريد/الهاتف وكلمة المرور" }, 400);
  }

  const ip = clientIp(request as unknown as Request & { headers: Headers });
  const limited = await enforceRateLimit("login", ip, normalizeEmail(identifier));
  if (!limited.allowed) {
    return json({ success: false, message: "محاولات كثيرة، حاول لاحقًا" }, 429);
  }

  const conditions: SQL[] = [];
  if (email) conditions.push(eq(users.email, email));
  if (phone) conditions.push(eq(users.phone, phone));

  const { db, end } = getDb();
  let user: typeof users.$inferSelect | undefined;
  try {
    const rows = conditions.length
      ? await db.select().from(users).where(or(...conditions)).limit(1)
      : [];
    user = rows[0];
  } finally {
    await end();
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return json({ success: false, message: "بيانات الدخول غير صحيحة" }, 401);
  }

  if (!isAccountUsable(user.status, user.isActive)) {
    return json({ success: false, message: "الحساب غير مفعّل أو موقوف" }, 403);
  }

  const sessionRole = mapSessionRole(user.role);
  const token = await signSessionPayload(
    {
      userId: user.id,
      role: user.role,
      permissions: permissionsForSessionRole(sessionRole),
    },
    getRuntimeEnv().sessionSecret,
    { expiresInSeconds: DESKTOP_TOKEN_TTL_SECONDS },
  );

  return json(
    {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.name ?? user.email ?? phone,
        role: sessionRole,
      },
    },
    200,
  );
}
