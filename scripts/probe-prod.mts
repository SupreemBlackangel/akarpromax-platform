import { buildVerificationRecord } from "@/lib/auth/verification";
import { createVerificationChallenge } from "@/lib/db/verification";

const BASE = "http://localhost:3011";

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

async function insertChallenge(userId: string, purpose: "email_verification", destination: string, tokenValue: string) {
  const record = await buildVerificationRecord({ userId, purpose, destination, tokenValue });
  await createVerificationChallenge({ userId, purpose, destination, tokenHash: record.tokenHash, codeHash: record.codeHash, expiresAt: record.expiresAt });
}

async function main() {
  const stamp = Date.now();
  const email = `prodt.${stamp}@disposable.test`;
  const pw = "ProdTest@1234";
  const vTok = `prod-verify-${stamp}-abcdef`;

  let r = await req("/api/auth/register", { method: "POST", body: { name: "Prod Tester", email, password: pw } });
  const registerData = r.data as { user?: { id?: string; status?: unknown } } | null;
  console.log("register", r.status, registerData?.user?.status);
  const uid = registerData?.user?.id as string;

  await insertChallenge(uid, "email_verification", email, vTok);
  r = await req("/api/auth/verify-email", { method: "POST", body: { token: vTok } });
  console.log("verify", r.status, JSON.stringify(r.data));

  r = await req("/api/auth/login", { method: "POST", body: { identifier: email, password: pw } });
  console.log("login", r.status);
  const cookie = r.setCookie?.split(";")[0];

  r = await req("/admin", { cookie });
  console.log("admin-logged-in", r.status);

  r = await req("/api/auth/logout", { method: "POST", cookie });
  console.log("logout", r.status);

  r = await req("/api/auth/me", { cookie });
  console.log("me-after-logout", r.status, JSON.stringify(r.data));
  for (let i = 0; i < 3; i++) {
    const a = await req("/admin", { cookie });
    console.log(`admin-after-logout[${i}]`, a.status, a.location ?? "");
  }
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
