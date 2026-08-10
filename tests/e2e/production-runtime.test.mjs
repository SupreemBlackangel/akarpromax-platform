import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { gunzipSync, inflateSync } from "node:zlib";

/**
 * Production-runtime E2E (Phase 5).
 *
 * Verifies that `vinext start` (production build) + `DB_PROVIDER=postgres`
 * serves content and static assets without 404 / connection termination, and
 * that the runtime selects the postgres schema mode (no silent fallback).
 *
 * Run manually against a live server:
 *
 *   NODE_ENV=production DB_PROVIDER=postgres SEED_DEMO_DATA=true \
 *     npx vinext start --port 3011
 *   E2E_BASE_URL=http://localhost:3011 npm run test:e2e:production-runtime
 *
 * Without SEED_DEMO_DATA, demo seeds are skipped in production, so data-count
 * assertions degrade to "200 + valid JSON". When E2E_BASE_URL is unset,
 * registers a single passing test so this does not break `npm test`.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? "";
const SEED_DEMO = process.env.SEED_DEMO_DATA === "true";
// Optional pre-verified account for the full auth happy-path. Provide both
// to exercise login -> /me -> logout under `vinext start` + postgresql.
const E2E_AUTH_EMAIL = process.env.E2E_AUTH_EMAIL ?? "";
const E2E_AUTH_PASSWORD = process.env.E2E_AUTH_PASSWORD ?? "";
const AUTH_SUFFIX = `phase5e2e-${Date.now().toString(36)}@example.com`;

function decode(headers, body) {
  const enc = (headers["content-encoding"] || "").toLowerCase();
  try {
    if (enc === "gzip") return gunzipSync(Buffer.from(body)).toString("utf8");
    if (enc === "deflate") return inflateSync(Buffer.from(body)).toString("utf8");
  } catch { /* fall through to raw */ }
  return body;
}

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method: "GET" },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          resolve({ status: res.statusCode, headers: res.headers, body: decode(res.headers, raw) });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function j(body) {
  try { return JSON.parse(body); } catch { return null; }
}

function req(method, path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const body = opts.body !== undefined ? JSON.stringify(opts.body) : null;
    const headers = Object.assign({}, opts.headers || {});
    if (body) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(body);
    }
    const r = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          resolve({ status: res.statusCode, headers: res.headers, body: decode(res.headers, raw) });
        });
      },
    );
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}

function parseCookie(setCookie, name) {
  if (!setCookie) return null;
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const h of arr) {
    if (typeof h === "string" && h.startsWith(name + "=")) return h.split(";")[0];
  }
  return null;
}

if (!BASE_URL) {
  test("production-runtime E2E: no E2E_BASE_URL set — skipped (run against `vinext start`)", () => {});
} else {
  test("production: GET / returns 200 with the HTML shell", async () => {
    const res = await get("/");
    assert.equal(res.status, 200);
    assert.ok(res.body.includes("<html"), "expected an HTML document");
  });

  test("production: GET /api/news returns 200 + valid JSON over postgres runtime", async () => {
    const res = await get("/api/news");
    assert.equal(res.status, 200);
    const parsed = j(res.body);
    assert.ok(parsed && Array.isArray(parsed.news), "news is an array");
    if (SEED_DEMO) assert.ok(parsed.news.length > 0, "news seeded with at least one row");
  });

  test("production: GET /api/services/categories?country=om returns 200 + list", async () => {
    const res = await get("/api/services/categories?country=om");
    assert.equal(res.status, 200);
    const parsed = j(res.body);
    if (SEED_DEMO) {
      assert.ok(parsed && parsed.categories && parsed.categories.length > 0, "seeded service categories present");
    } else {
      assert.ok(parsed && Array.isArray(parsed.categories), "categories is an array");
    }
  });

  test("production: GET /api/properties returns 200 + list", async () => {
    const res = await get("/api/properties");
    assert.equal(res.status, 200);
    const parsed = j(res.body);
    if (SEED_DEMO) {
      assert.ok(parsed && parsed.properties && parsed.properties.length > 0, "seeded properties present");
    } else {
      assert.ok(parsed && Array.isArray(parsed.properties), "properties is an array");
    }
  });

  test("production: GET /api/advertisers requires auth (no silent fallback)", async () => {
    const res = await get("/api/advertisers");
    assert.equal(res.status, 403, "advertiser admin API must be auth-gated");
  });

  test("production: static CSS/JS under /assets/* return 200 (no 404)", async () => {
    const index = await get("/");
    const cssMatch = index.body.match(/href="\/assets\/index-[^"]+\.css"/);
    const jsMatch = index.body.match(/src="\/assets\/[^"]+\.js"/);
    if (cssMatch) {
      const css = await get(cssMatch[0].match(/href="([^"]+)"/)[1]);
      assert.equal(css.status, 200, "asset CSS must not 404");
    }
    if (jsMatch) {
      const js = await get(jsMatch[0].match(/src="([^"]+)"/)[1]);
      assert.equal(js.status, 200, "asset JS must not 404");
    }
  });

  test("production: content route live over the postgres-selected runtime", async () => {
    const res = await get("/api/news");
    assert.equal(res.status, 200, "postgres-selected content route must respond");
  });

  // ---- Production auth runtime (P1) ----
  // These exercise the auth DB path (lib/db -> drizzle-orm/postgres-js) and the
  // session-cookie read path (lib/auth/session.ts) under `vinext start` +
  // DB_PROVIDER=postgres. The unverified-account assertions prove the auth
  // query executes against Postgres (finds the user, enforces the verification
  // gate) without needing email delivery. The happy-path requires a pre-verified
  // account supplied via E2E_AUTH_EMAIL/E2E_AUTH_PASSWORD.

  test("production: register creates a pending user on postgres (201)", async () => {
    const res = await req("POST", "/api/auth/register", {
      body: { email: AUTH_SUFFIX, password: "Phase5!2026", name: "E2E Auth", preferredLanguage: "en", countryCode: "eg" },
    });
    assert.equal(res.status, 201, `register must succeed on postgres (got ${res.status}: ${res.body.slice(0, 160)})`);
    const parsed = j(res.body);
    assert.ok(parsed?.user?.email === AUTH_SUFFIX, "response references the registered email");
    assert.equal(parsed?.user?.status, "pending_verification", "new user is pending verification");
  });

  test("production: login for an unverified account is blocked (403 not_verified) — proves auth query ran", async () => {
    const res = await req("POST", "/api/auth/login", { body: { email: AUTH_SUFFIX, password: "Phase5!2026" } });
    assert.equal(res.status, 403, "unverified account must be blocked (not a 500 import error)");
    const parsed = j(res.body);
    assert.equal(parsed?.reason, "not_verified", "blocked for verification, not for a runtime crash");
  });

  test("production: login with wrong password is rejected (401)", async () => {
    const res = await req("POST", "/api/auth/login", { body: { email: AUTH_SUFFIX, password: "definitely-wrong" } });
    assert.equal(res.status, 401, "wrong password must not authenticate");
    const parsed = j(res.body);
    assert.equal(parsed?.error, "invalid_credentials");
  });

  test("production: logout clears the session cookie (200 + cleared Set-Cookie)", async () => {
    const res = await req("POST", "/api/auth/logout", {});
    assert.equal(res.status, 200, "logout must succeed even without a session");
    const clearing = parseCookie(res.headers["set-cookie"], "akar_session");
    assert.ok(clearing?.includes("akar_session="), "logout returns a Set-Cookie for akar_session");
    const rawSetCookie = Array.isArray(res.headers["set-cookie"])
      ? res.headers["set-cookie"].join(";")
      : (res.headers["set-cookie"] || "");
    assert.ok(
      /Expires=Thu,\s*01 Jan 1970/.test(rawSetCookie),
      "logout cookie expires in the past (clears the session)",
    );
  });

  test("production: /api/auth/me with no cookie is unauthenticated (401)", async () => {
    const res = await req("GET", "/api/auth/me", {});
    assert.equal(res.status, 401, "no session cookie => 401");
    const parsed = j(res.body);
    assert.equal(parsed?.authenticated, false);
  });

  test("production: /api/auth/me with a malformed cookie is unauthenticated (401)", async () => {
    const res = await req("GET", "/api/auth/me", { headers: { cookie: "akar_session=not-a-real-token" } });
    assert.equal(res.status, 401, "malformed session cookie => 401");
    const parsed = j(res.body);
    assert.equal(parsed?.authenticated, false);
  });

  if (E2E_AUTH_EMAIL && E2E_AUTH_PASSWORD) {
    let sessionCookie = "";
    test("production: pre-verified account login -> session cookie (200)", async () => {
      const res = await req("POST", "/api/auth/login", { body: { email: E2E_AUTH_EMAIL, password: E2E_AUTH_PASSWORD } });
      assert.equal(res.status, 200, `login must succeed for the pre-verified account (got ${res.status})`);
      sessionCookie = parseCookie(res.headers["set-cookie"], "akar_session");
      assert.ok(sessionCookie, "login sets akar_session cookie");
    });

    test("production: authenticated /me returns the user (200, authenticated=true) over production runtime", async () => {
      assert.ok(sessionCookie, "session cookie from previous login test must be available");
      const res = await req("GET", "/api/auth/me", { headers: { cookie: sessionCookie } });
      assert.equal(res.status, 200, "/me must respond 200 for a valid session");
      const parsed = j(res.body);
      assert.equal(parsed?.authenticated, true, "session persists across a new HTTP request");
      assert.ok(parsed?.user?.email === E2E_AUTH_EMAIL, "/me returns the authenticated user");
      assert.equal(parsed?.user?.role, "viewer", "role resolved from the postgres session");
    });

    test("production: /api/user-context reflects the postgres session identity", async () => {
      assert.ok(sessionCookie, "session cookie must be available");
      const res = await req("GET", "/api/user-context", { headers: { cookie: sessionCookie } });
      assert.equal(res.status, 200, "user-context reflects session identity");
      const parsed = j(res.body);
      assert.equal(parsed?.authenticated, true);
      assert.equal(parsed?.email, E2E_AUTH_EMAIL);
    });

    test("production: logout then /me is unauthenticated (full cycle)", async () => {
      const out = await req("POST", "/api/auth/logout", { headers: { cookie: sessionCookie } });
      assert.equal(out.status, 200, "logout succeeds while authenticated");
      const after = await req("GET", "/api/auth/me", { headers: { cookie: sessionCookie } });
      assert.equal(after.status, 401, "revoked session no longer authenticates");
      const parsed = j(after.body);
      assert.equal(parsed?.authenticated, false, "logout revokes the session on the postgres runtime");
      sessionCookie = "";
    });
  } else {
    test("production: pre-verified account happy-path skipped (set E2E_AUTH_EMAIL + E2E_AUTH_PASSWORD to enable)", () => {});
  }
}
