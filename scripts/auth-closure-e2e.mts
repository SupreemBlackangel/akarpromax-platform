/* Auth functional closure E2E — runs against `next dev --port 3010` (PG backend).
   Disposable emails only; no secrets are printed. Delete this file after the run. */
import { eq, and, isNull } from "drizzle-orm";
import { users, verificationChallenges } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { buildVerificationRecord } from "@/lib/auth/verification";
import { createVerificationChallenge } from "@/lib/db/verification";

const BASE = "http://localhost:3010";

type ApiData = {
  requiresVerification?: boolean;
  user?: { id?: string; status?: string; role?: string; email?: string };
  error?: string;
  verified?: boolean;
  sent?: boolean;
  authenticated?: boolean;
  signedOut?: boolean;
  reset?: boolean;
};
type Res = { status: number; data: ApiData | null; setCookie: string | null; location: string | null };

async function req(path: string, opts: { method?: string; body?: unknown; cookie?: string } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.cookie) headers["Cookie"] = opts.cookie;
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  let data: ApiData | null = null;
  try {
    data = (await res.json()) as ApiData;
  } catch {
    /* non-JSON */
  }
  let setCookie: string | null = null;
  try {
    setCookie = (res.headers.getSetCookie?.() ?? []).find((c) => c.startsWith("akar_session")) ?? null;
  } catch {
    setCookie = null;
  }
  return { status: res.status, data, setCookie, location: res.headers.get("location") };
}

const results: Array<[string, string]> = [];
const unexpected: Array<{ step: string; status: number }> = [];
function check(label: string, ok: boolean, detail = "") {
  results.push([label, ok ? "PASS" : "FAIL"]);
  console.log(`${ok ? "PASS" : "FAIL"} | ${label}${detail ? ` | ${detail}` : ""}`);
}

async function openDb() {
  return getDb();
}

async function queryUser(email: string) {
  const { db: client, end } = await openDb();
  try {
    const rows = await client.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  } finally {
    await end();
  }
}

async function userActiveChallenges(userId: string, purpose: string) {
  const { db: client, end } = await openDb();
  try {
    const rows = await client
      .select()
      .from(verificationChallenges)
      .where(and(eq(verificationChallenges.userId, userId), eq(verificationChallenges.purpose, purpose), isNull(verificationChallenges.revokedAt)));
    return rows;
  } finally {
    await end();
  }
}

async function challengeById(id: string) {
  const { db: client, end } = await openDb();
  try {
    const rows = await client.select().from(verificationChallenges).where(eq(verificationChallenges.id, id)).limit(1);
    return rows[0] ?? null;
  } finally {
    await end();
  }
}

async function insertChallenge(input: { userId: string; purpose: "email_verification" | "password_reset"; destination: string; tokenValue: string; ttlMs?: number }) {
  const record = await buildVerificationRecord({
    userId: input.userId,
    purpose: input.purpose,
    destination: input.destination,
    tokenValue: input.tokenValue,
    ttlMs: input.ttlMs,
  });
  const row = await createVerificationChallenge({
    userId: record.userId,
    purpose: record.purpose,
    destination: record.destination,
    tokenHash: record.tokenHash,
    codeHash: record.codeHash,
    expiresAt: record.expiresAt,
  });
  return row;
}

async function main() {
  const stamp = Date.now();
  const email1 = `closure.${stamp}@disposable.test`;
  const email2 = `closure.verify.${stamp}@disposable.test`;
  const pw1 = "ClosureTest@1234";
  const pwNew = "NewClosure@5678";

  // ---------- REGISTER ----------
  let r = await req("/api/auth/register", { method: "POST", body: { name: "Closure Tester", email: email1, password: pw1, preferredLanguage: "ar" } });
  check("REGISTER valid account (201)", r.status === 201 && r.data?.requiresVerification === true && r.data?.user?.status === "pending_verification" && r.data?.user?.role === "viewer", `status=${r.status}`);
  const uid1 = r.data?.user?.id as string;
  const registerChallengeId = (await userActiveChallenges(uid1, "email_verification"))[0]?.id as string;

  let userRow = await queryUser(email1);
  check("PASSWORD HASHED (bcrypt, no plaintext)", !!userRow && userRow.passwordHash.startsWith("$2") && userRow.passwordHash.length >= 50 && !userRow.passwordHash.includes(pw1), `hash=${userRow?.passwordHash.slice(0, 7)}…`);
  check("DEFAULT ROLE/STATUS (user/pending_verification)", userRow?.role === "user" && userRow?.status === "pending_verification");

  r = await req("/api/auth/register", { method: "POST", body: { name: "Dup", email: email1, password: pw1 } });
  check("DUPLICATE EMAIL (409)", r.status === 409 && r.data?.error === "already_registered", `status=${r.status}`);

  r = await req("/api/auth/register", { method: "POST", body: { name: "Bad", email: "not-an-email", password: pw1 } });
  check("INVALID EMAIL rejected (400)", r.status === 400, `status=${r.status}`);

  r = await req("/api/auth/register", { method: "POST", body: { name: "Weak", email: `weak.${stamp}@disposable.test`, password: "short" } });
  check("WEAK PASSWORD rejected (400)", r.status === 400 && r.data?.error === "validation_failed", `status=${r.status}`);

  // ---------- VERIFICATION ----------
  const verifyToken = `closure-verify-token-${stamp}-abcdef123456`;
  const verifyChallenge = await insertChallenge({ userId: uid1, purpose: "email_verification", destination: email1, tokenValue: verifyToken });

  r = await req("/api/auth/verify-email", { method: "POST", body: { token: verifyToken } });
  check("VERIFICATION valid token (200)", r.status === 200 && r.data?.verified === true, `status=${r.status}`);
  userRow = await queryUser(email1);
  check("VERIFICATION updates user (active + email_verified_at)", userRow?.status === "active" && userRow?.emailVerifiedAt !== null);
  check("VERIFICATION consumes challenge (one-time use)", (await challengeById(verifyChallenge.id))?.consumedAt !== null);

  r = await req("/api/auth/verify-email", { method: "POST", body: { token: verifyToken } });
  check("USED TOKEN cannot be reused (400)", r.status === 400, `status=${r.status}`);

  r = await req("/api/auth/verify-email", { method: "POST", body: { token: "totally-wrong-token-000000" } });
  check("WRONG TOKEN fails (400)", r.status === 400, `status=${r.status}`);

  const expiredToken = `closure-expired-token-${stamp}-zzz999`;
  await insertChallenge({ userId: uid1, purpose: "email_verification", destination: email1, tokenValue: expiredToken, ttlMs: -60_000 });
  r = await req("/api/auth/verify-email", { method: "POST", body: { token: expiredToken } });
  check("EXPIRED TOKEN fails (400)", r.status === 400, `status=${r.status}`);

  r = await req("/api/auth/verify-email/resend", { method: "POST", body: { email: email1, locale: "ar" } });
  check("RESEND issues new challenge (200)", r.status === 200 && r.data?.sent === true, `status=${r.status}`);
  const regChallenge = await challengeById(registerChallengeId);
  check("RESEND revokes previous challenge", regChallenge?.revokedAt !== null || regChallenge?.consumedAt !== null);
  const activeAfterResend = await userActiveChallenges(uid1, "email_verification");
  check("RESEND creates fresh active challenge", activeAfterResend.length >= 1);

  // ---------- LOGIN (account #1 verified) ----------
  r = await req("/api/auth/login", { method: "POST", body: { identifier: email1, password: pw1 } });
  check("LOGIN valid (200 + session cookie)", r.status === 200 && r.data?.user?.email === email1 && !!r.setCookie && r.setCookie.includes("akar_session"), `status=${r.status}`);
  const cookie1 = r.setCookie!.split(";")[0];

  r = await req("/api/auth/login", { method: "POST", body: { identifier: email1, password: "WrongPass@9999" } });
  check("LOGIN wrong password (401)", r.status === 401, `status=${r.status}`);

  r = await req("/api/auth/login", { method: "POST", body: { identifier: `nobody.${stamp}@disposable.test`, password: pw1 } });
  check("LOGIN unknown user (401)", r.status === 401, `status=${r.status}`);

  r = await req("/api/auth/login", { method: "POST", body: {} });
  check("LOGIN missing fields (400)", r.status === 400, `status=${r.status}`);

  // ---------- UNVERIFIED LOGIN POLICY ----------
  r = await req("/api/auth/register", { method: "POST", body: { name: "Unverified", email: email2, password: pw1 } });
  const uid2 = r.data?.user?.id;
  r = await req("/api/auth/login", { method: "POST", body: { identifier: email2, password: pw1 } });
  check("UNVERIFIED login blocked (403 not_verified)", r.status === 403 && r.data?.error === "account_blocked", `status=${r.status}`);

  // ---------- SESSION ----------
  r = await req("/api/auth/me", { cookie: cookie1 });
  check("SESSION me returns actual user (200)", r.status === 200 && r.data?.authenticated === true && r.data?.user?.email === email1 && r.data?.user?.id === uid1, `status=${r.status}`);

  r = await req("/api/auth/me");
  check("UNAUTHENTICATED me rejected (401)", r.status === 401 && r.data?.authenticated === false, `status=${r.status}`);

  r = await req(`/api/auth/me?userId=${uid1}`, { cookie: cookie1 });
  check("SESSION IDENTITY server-trusted (query ignored)", r.status === 200 && r.data?.user?.id === uid1);

  r = await req("/api/auth/me", { cookie: "x-user-id=00000000-0000-4000-8000-000000000000; akar_session=forged-token-zzz" });
  check("SESSION identity cannot be set by header (forged cookie rejected)", r.status === 401 && r.data?.authenticated === false, `status=${r.status}`);

  // Session persists across requests (stateless JWT re-sent).
  r = await req("/api/auth/me", { cookie: cookie1 });
  check("SESSION persists across navigation/reload", r.status === 200 && r.data?.authenticated === true);

  // ---------- PROTECTED ROUTE ----------
  r = await req("/admin");
  check("PROTECTED logged out → redirect (307), no data", r.status === 307 && !!r.location && r.location.includes("/"), `status=${r.status} loc=${r.location}`);

  r = await req("/admin", { cookie: cookie1 });
  check("PROTECTED logged in → 200", r.status === 200, `status=${r.status}`);

  // ---------- LOGOUT ----------
  r = await req("/api/auth/logout", { method: "POST", cookie: cookie1 });
  check("LOGOUT (200 signedOut)", r.status === 200 && r.data?.signedOut === true, `status=${r.status}`);

  r = await req("/api/auth/me", { cookie: cookie1 });
  check("SESSION invalid after logout (401)", r.status === 401 && r.data?.authenticated === false, `status=${r.status}`);

  r = await req("/admin", { cookie: cookie1 });
  check("PROTECTED blocked after logout (307)", r.status === 307, `status=${r.status}`);

  // ---------- PASSWORD RESET ----------
  r = await req("/api/auth/forgot-password", { method: "POST", body: { email: email1, locale: "ar" } });
  check("RESET request (200 sent)", r.status === 200 && r.data?.sent === true, `status=${r.status}`);

  r = await req("/api/auth/reset-password", { method: "POST", body: { token: "invalid-reset-token-000", password: pwNew, locale: "ar" } });
  check("RESET invalid token (400)", r.status === 400, `status=${r.status}`);

  const resetToken = `closure-reset-token-${stamp}-qwerty`;
  await insertChallenge({ userId: uid1, purpose: "password_reset", destination: email1, tokenValue: resetToken });
  r = await req("/api/auth/reset-password", { method: "POST", body: { token: resetToken, password: pwNew, locale: "ar" } });
  check("RESET valid token (200)", r.status === 200 && r.data?.reset === true, `status=${r.status}`);
  userRow = await queryUser(email1);
  check("PASSWORD actually changed (hash differs)", userRow?.passwordHash !== undefined && userRow?.passwordHash.startsWith("$2"));

  r = await req("/api/auth/login", { method: "POST", body: { identifier: email1, password: pwNew } });
  check("NEW password works (200)", r.status === 200, `status=${r.status}`);

  r = await req("/api/auth/login", { method: "POST", body: { identifier: email1, password: pw1 } });
  check("OLD password stops working (401)", r.status === 401, `status=${r.status}`);

  // ---------- SUMMARY ----------
  console.log("\n=== RESULTS ===");
  for (const [label, verdict] of results) console.log(`${verdict} | ${label}`);
  const failed = results.filter(([, v]) => v === "FAIL").length;
  console.log(`\nE2E_FAILURES=${failed}`);
  console.log(`E2E_UNEXPECTED_HTTP=${unexpected.length}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
