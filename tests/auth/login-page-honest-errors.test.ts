import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { authLabels } from "../../lib/auth-labels";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * The login page told a visitor on www.akarpromax.com that their password was
 * wrong. It was not: every POST from that origin answers 403 origin_rejected,
 * and the page mapped every non-2xx except account_blocked to
 * "invalid credentials". The owner reset the admin password on that advice
 * and it still "was wrong".
 */
test("the login page names origin rejection, rate limiting and outages separately", async () => {
  const page = await readFile(path.join(ROOT, "app/login/page.tsx"), "utf8");
  const branch = page.slice(page.indexOf("if (!res.ok) {"), page.indexOf("const user = data.user"));

  assert.match(branch, /"origin_rejected"[\s\S]*t\.error\.originRejected/);
  assert.match(branch, /"rate_limited"[\s\S]*t\.error\.rateLimited/);
  assert.match(branch, /res\.status >= 500[\s\S]*t\.error\.serviceUnavailable/);
  // invalidCredentials is the fallthrough, not the default for everything.
  assert.ok(branch.lastIndexOf("t.error.invalidCredentials") > branch.indexOf("t.error.serviceUnavailable"));
});

test("every locale carries the two new messages, and the origin one says what to do", () => {
  for (const locale of ["ar", "en", "tr"] as const) {
    const { originRejected, serviceUnavailable } = authLabels(locale).error;
    assert.ok(originRejected.length > 20, `${locale} originRejected`);
    assert.ok(serviceUnavailable.length > 20, `${locale} serviceUnavailable`);
    // The actionable part. Chrome hides "www." in the address bar, so the
    // visitor cannot see the cause; the message has to say it.
    assert.match(originRejected, /www/, `${locale} originRejected must mention www`);
    assert.notEqual(originRejected, authLabels(locale).error.invalidCredentials);
  }
});
