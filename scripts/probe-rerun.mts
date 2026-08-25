import { eq, and, isNull } from "drizzle-orm";
import { users, verificationChallenges } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { buildVerificationRecord } from "@/lib/auth/verification";
import { createVerificationChallenge } from "@/lib/db/verification";

const BASE = "http://localhost:3010";

async function req(path: string, opts: { method?: string; body?: unknown; cookie?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.cookie) headers["Cookie"] = opts.cookie;
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  let data: unknown = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data, setCookie: res.headers.get("set-cookie"), location: res.headers.get("location") };
}

async function insertChallenge(userId: string, purpose: "password_reset" | "email_verification", destination: string, tokenValue: string) {
  const record = await buildVerificationRecord({ userId, purpose, destination, tokenValue });
  return createVerificationChallenge({ userId, purpose, destination, tokenHash: record.tokenHash, codeHash: record.codeHash, expiresAt: record.expiresAt });
}

async function main() {
  const stamp = Date.now();
  const email = `resettest.${stamp}@disposable.test`;
  const pw = "ResetTest@1234";
  const pwNew = "ResetTest@5678";

  // register
  let r = await req("/api/auth/register", { method: "POST", body: { name: "Reset Tester", email, password: pw } });
  const registerData = r.data as { user?: { id?: string; status?: unknown } } | null;
  const uid = registerData?.user?.id as string;
  console.log("register", r.status, registerData?.user?.status);

  // verify via known token
  const vTok = `rt-verify-${stamp}-abcdef`;
  await insertChallenge(uid, "email_verification", email, vTok);
  r = await req("/api/auth/verify-email", { method: "POST", body: { token: vTok } });
  console.log("verify", r.status, JSON.stringify(r.data));

  // reset challenge then reset
  const rTok = `rt-reset-${stamp}-qwerty`;
  const ch = await insertChallenge(uid, "password_reset", email, rTok);
  console.log("challenge expiresAt", ch.expiresAt?.toISOString?.(), "now", new Date().toISOString(), "diffMin", Math.round(((ch.expiresAt.getTime()) - Date.now()) / 60000));

  r = await req("/api/auth/reset-password", { method: "POST", body: { token: rTok, password: pwNew, locale: "ar" } });
  console.log("reset", r.status, JSON.stringify(r.data));

  r = await req("/api/auth/login", { method: "POST", body: { identifier: email, password: pwNew } });
  console.log("login-new", r.status);
  const cookie = r.setCookie?.split(";")[0];
  r = await req("/api/auth/login", { method: "POST", body: { identifier: email, password: pw } });
  console.log("login-old", r.status);

  // logout -> admin / me
  r = await req("/api/auth/logout", { method: "POST", cookie });
  console.log("logout", r.status);
  for (let i = 0; i < 4; i++) {
    r = await req("/api/auth/me", { cookie });
    const a = await req("/admin", { cookie });
    console.log(`loop${i} me=${r.status} admin=${a.status} adminLoc=${a.location}`);
  }
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
