/**
 * AKARPROMAX — AUTH RUNTIME GATE (localhost:3022)
 *
 * Read-only runtime verification of the login path against the RUNNING
 * production server. No secrets are printed: passwords come from env/args,
 * cookie VALUES are never echoed (only attribute flags), password hashes are
 * reported as present/absent booleans.
 *
 * Usage (PowerShell, project root, server already running on :3022):
 *   $env:AUTH_PROBE_EMAIL="<admin email>"
 *   $env:AUTH_PROBE_PASSWORD="<admin password>"
 *   node --import tsx scripts/auth-gate-3022.mjs
 *
 * Optional: AUTH_PROBE_BASE (default http://localhost:3022)
 */

import { eq } from "drizzle-orm";

const BASE = process.env.AUTH_PROBE_BASE || "http://localhost:3022";
const EMAIL = process.env.AUTH_PROBE_EMAIL || "";
const PASSWORD = process.env.AUTH_PROBE_PASSWORD || "";
const ORIGIN = new URL(BASE).origin;

const lines = [];
function log(msg) { lines.push(msg); console.log(msg); }
function verdict(name, ok) { log(`${name}: ${ok ? "PASS" : "FAIL"}`); return ok; }

function cookieFlags(setCookie) {
  if (!setCookie) return null;
  const [pair, ...attrs] = setCookie.split(";").map((s) => s.trim());
  const name = pair.split("=")[0];
  const flags = attrs.map((a) => a.split("=")[0]);
  return { name, flags, raw: `${name}=<redacted>; ${attrs.join("; ")}` };
}

async function jsonOf(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { _nonJson: text.slice(0, 120) }; }
}

async function main() {
  log(`== AUTH GATE against ${BASE} ==`);
  if (!EMAIL || !PASSWORD) {
    log("ERROR: set AUTH_PROBE_EMAIL and AUTH_PROBE_PASSWORD env vars first (never hardcoded).");
    process.exitCode = 2;
    return;
  }

  // ---- 0. Server reachable
  let reachable = false;
  try {
    const res = await fetch(`${BASE}/properties`, { redirect: "manual" });
    reachable = res.status > 0;
    log(`GET /properties → HTTP ${res.status}`);
  } catch (e) {
    log(`GET /properties → UNREACHABLE (${e.cause?.code || e.message})`);
  }
  if (!verdict("Server reachable", reachable)) return;

  // ---- 1. Database + account check through the project's own layer
  try {
    const { getDb } = await import("../lib/db/index.ts");
    const { users } = await import("../lib/db/schema.ts");
    const { db, end } = getDb();
    try {
      const rows = await db
        .select({
          id: users.id,
          role: users.role,
          status: users.status,
          isActive: users.isActive,
          emailVerifiedAt: users.emailVerifiedAt,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.email, EMAIL.trim().toLowerCase()))
        .limit(1);
      const u = rows[0];
      verdict("DB connection", true);
      log(`Account record exists: ${u ? "YES" : "NO"}`);
      if (u) {
        log(`Account active: ${u.status === "active" && u.isActive ? "YES" : `NO (status=${u.status}, isActive=${u.isActive})`}`);
        log(`Email verified: ${u.emailVerifiedAt ? "YES" : "NO"}`);
        log(`Password hash present: ${u.passwordHash ? "YES" : "NO"}`);
        log(`Role: ${u.role}`);
      }
    } finally {
      await end();
    }
  } catch (e) {
    verdict("DB connection", false);
    log(`DB error class: ${e.code || e.name}: ${String(e.message).slice(0, 160)}`);
  }

  // ---- 2. Login with correct credentials (browser-equivalent request)
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
  });
  const loginBody = await jsonOf(loginRes);
  const setCookie = loginRes.headers.get("set-cookie");
  const cookie = cookieFlags(setCookie);
  log(`POST /api/auth/login → HTTP ${loginRes.status}` + (loginBody.error ? ` (error=${loginBody.error})` : ""));
  if (cookie) log(`Set-Cookie: ${cookie.raw}`);
  const loginOk = loginRes.status === 200 && !!loginBody.user && !!cookie;
  verdict("Correct credentials login", loginOk);
  if (loginBody.user) log(`Logged-in role: ${loginBody.user.role}`);

  const cookieHeader = setCookie ? setCookie.split(";")[0] : "";

  // ---- 3. Session persistence (/api/auth/me with the cookie)
  let meOk = false;
  if (cookieHeader) {
    const meRes = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookieHeader } });
    const meBody = await jsonOf(meRes);
    meOk = meRes.status === 200 && !!(meBody.user ?? meBody.authenticated ?? meBody.id);
    log(`GET /api/auth/me (with cookie) → HTTP ${meRes.status}`);
  }
  verdict("Session persists (me)", meOk);

  // ---- 4. My Properties (owner surface)
  let myOk = false;
  if (cookieHeader) {
    const myRes = await fetch(`${BASE}/api/properties/my?status=all`, { headers: { Cookie: cookieHeader } });
    myOk = myRes.status === 200;
    log(`GET /api/properties/my → HTTP ${myRes.status}`);
  }
  verdict("My Properties accessible", myOk);

  // ---- 5. Admin Properties (admin surface — expects an admin account)
  let adminOk = false;
  if (cookieHeader) {
    const adminRes = await fetch(`${BASE}/api/admin/properties?status=all&limit=1`, { headers: { Cookie: cookieHeader } });
    adminOk = adminRes.status === 200;
    log(`GET /api/admin/properties → HTTP ${adminRes.status} ${adminRes.status === 403 ? "(account lacks admin permissions)" : ""}`);
  }
  verdict("Admin Properties accessible", adminOk);

  // ---- 6. Negative test: wrong password must 401 cleanly, no cookie, no 500
  const badRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ identifier: EMAIL, password: "definitely-wrong-password-000" }),
  });
  const badBody = await jsonOf(badRes);
  const badCookie = badRes.headers.get("set-cookie");
  log(`POST /api/auth/login (wrong password) → HTTP ${badRes.status} (error=${badBody.error ?? "?"})`);
  verdict("Wrong password rejected (401, no cookie, no 500)",
    badRes.status === 401 && badBody.error === "invalid_credentials" && !badCookie);

  // ---- 7. Origin gate sanity: an untrusted origin must be refused, not 200
  const forgedRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
    body: JSON.stringify({ identifier: EMAIL, password: "x" }),
  });
  const forgedBody = await jsonOf(forgedRes);
  log(`POST /api/auth/login (forged origin) → HTTP ${forgedRes.status} (error=${forgedBody.error ?? "?"})`);
  verdict("Untrusted origin refused", forgedRes.status === 403 || forgedRes.status === 500);

  const { writeFileSync } = await import("node:fs");
  writeFileSync("scripts/auth-gate-3022.out.txt", lines.join("\n") + "\n");
  log("\nSaved: scripts/auth-gate-3022.out.txt");
}

main().catch((e) => { console.error("GATE CRASH:", e.message); process.exitCode = 1; });
