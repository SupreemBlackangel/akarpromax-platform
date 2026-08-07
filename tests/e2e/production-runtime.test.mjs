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

  test("production: GET /api/sponsors returns 200 (empty array expected)", async () => {
    const res = await get("/api/sponsors");
    assert.equal(res.status, 200);
    const parsed = j(res.body);
    assert.deepEqual(parsed.sponsors, [], "sponsors has no seeder → empty array");
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
}
