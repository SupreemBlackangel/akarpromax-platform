import assert from "node:assert/strict";
import test from "node:test";

// Environment-gated integration test for the services marketplace.
//
// Under `vinext dev` (D1-backed) or `vinext start` (MySQL-backed), run with:
//   SERVICES_E2E=1 SERVICES_BASE_URL=http://localhost:3011 node --import tsx --test tests/services-e2e.mjs
//
// When the environment variable is absent (CI / default), the suite prints
// "SKIPPED: integration environment unavailable" and exits successfully.

const E2E = process.env.SERVICES_E2E === "1";
const BASE_URL = process.env.SERVICES_BASE_URL || "http://localhost:3011";

if (!E2E) {
  console.log("SKIPPED: integration environment unavailable");
} else {
  test("public service categories endpoint responds with the seeded catalog", async () => {
    const res = await fetch(`${BASE_URL}/api/service-categories`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.categories), "expected { categories: [] }");
  });

  test("services admin overview requires a session (401 without one)", async () => {
    const res = await fetch(`${BASE_URL}/api/service-admin`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.error, "expected an error payload");
  });

  test("provider status updates require the review permission (401/403 without a session)", async () => {
    const res = await fetch(`${BASE_URL}/api/service-providers/p0/status`, { method: "PATCH", body: "{}" });
    assert.ok([401, 403].includes(res.status), `expected 401/403, got ${res.status}`);
  });
}

test("e2e gate is wired", () => {
  assert.equal(typeof E2E, "boolean");
  assert.equal(typeof BASE_URL, "string");
});
