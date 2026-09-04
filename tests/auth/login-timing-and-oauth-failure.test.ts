import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

Object.assign(process.env, {
  NODE_ENV: process.env.NODE_ENV || "test",
  SESSION_SECRET: process.env.SESSION_SECRET || "test-secret-".padEnd(48, "x"),
  TRUSTED_ORIGINS: "http://localhost:3010",
});

import bcrypt from "bcryptjs";
import {
  ABSENT_USER_PASSWORD_HASH,
  PASSWORD_COST,
  hashPassword,
  verifyAbsentUserPassword,
} from "../../lib/auth/password";
import {
  OAuthStageError,
  oauthFailureStage,
} from "../../lib/auth/oauth";
import {
  oauthCallbackErrorCode,
} from "../../lib/auth/oauth-callback";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---- login must not answer faster for an address nobody holds --------------

test("the stand-in hash is a real hash at the same cost as a stored password", async () => {
  // A cheaper hash would still leak: the timings only match if the work does.
  const prefix = ABSENT_USER_PASSWORD_HASH.split("$");
  assert.equal(prefix[0], "");
  assert.match(prefix[1], /^2[aby]$/);
  assert.equal(prefix[2], String(PASSWORD_COST));
  const real = await hashPassword("whatever-a-user-actually-chose");
  assert.equal(real.slice(0, 7), ABSENT_USER_PASSWORD_HASH.slice(0, 7));
});

test("the stand-in hash matches nothing", async () => {
  for (const guess of ["", "password", "password123", "123456", "admin"]) {
    assert.equal(await bcrypt.compare(guess, ABSENT_USER_PASSWORD_HASH), false);
  }
});

test("verifyAbsentUserPassword always returns false and never throws", async () => {
  assert.equal(await verifyAbsentUserPassword("anything"), false);
  assert.equal(await verifyAbsentUserPassword(""), false);
});

test("an unknown identifier costs the same as a known one, within tolerance", async () => {
  // The defect measured against production: ~1.0s for a registered address,
  // ~0.5s for an unregistered one, both answering `invalid_credentials`.
  const stored = await hashPassword("the-real-password");

  const time = async (fn: () => Promise<unknown>) => {
    const started = process.hrtime.bigint();
    await fn();
    return Number(process.hrtime.bigint() - started) / 1e6;
  };

  // Warm up, so neither path pays a one-time cost the other does not.
  await bcrypt.compare("x", stored);
  await verifyAbsentUserPassword("x");

  const found = await time(() => bcrypt.compare("a-wrong-guess", stored));
  const absent = await time(() => verifyAbsentUserPassword("a-wrong-guess"));

  // Both paths do one bcrypt at cost 12. The ratio is what an attacker reads;
  // the bound is loose enough for a loaded CI box and far tighter than the
  // 2x that was observable in production.
  const ratio = Math.max(found, absent) / Math.min(found, absent);
  assert.ok(ratio < 1.5, `timing ratio ${ratio.toFixed(2)} (found ${found.toFixed(0)}ms, absent ${absent.toFixed(0)}ms)`);
});

test("the login route spends that time before answering an unknown identifier", async () => {
  const route = await readFile(path.join(ROOT, "app/api/auth/login/route.ts"), "utf8");
  const branch = route.slice(route.indexOf("if (!user) {"), route.indexOf("const valid = await verifyPassword"));
  assert.match(branch, /await verifyAbsentUserPassword\(password\)/);
  // And it must come before the response, not after it.
  assert.ok(branch.indexOf("verifyAbsentUserPassword(password)") < branch.indexOf('error: "invalid_credentials"'));
});

// ---- a failed social sign-in must say which side failed --------------------

test("provider failures and our failures get different codes", () => {
  const providerSide = new OAuthStageError("facebook", "token_exchange", "Facebook token exchange failed: ...");
  const userInfoSide = new OAuthStageError("google", "user_info", "Failed to fetch Google user info");
  assert.equal(oauthCallbackErrorCode("facebook", providerSide), "facebook_provider_error");
  assert.equal(oauthCallbackErrorCode("google", userInfoSide), "google_provider_error");
});

test("an untagged error is ours, not the provider's", () => {
  // The production failure: findOrCreateOAuthUser threw a raw postgres error
  // because user_oauth_accounts did not exist. Nothing tags that, and calling
  // it a provider problem would point the investigation at Facebook.
  const dbError = new Error('relation "user_oauth_accounts" does not exist');
  assert.equal(oauthFailureStage(dbError), "account_link");
  assert.equal(oauthCallbackErrorCode("facebook", dbError), "facebook_account_error");
  assert.equal(oauthCallbackErrorCode("google", dbError), "google_account_error");
});

test("neither callback still redirects to the undifferentiated _failed code", async () => {
  for (const provider of ["facebook", "google"]) {
    const route = await readFile(
      path.join(ROOT, `app/api/auth/${provider}/callback/route.ts`),
      "utf8",
    );
    assert.doesNotMatch(route, new RegExp(`${provider}_failed`), `${provider} callback still swallows the reason`);
    assert.match(route, /recordOAuthCallbackFailure/, `${provider} callback must record why`);
    assert.match(route, /oauthCallbackErrorCode/, `${provider} callback must report which side failed`);
    // console.error was the whole of the evidence in production.
    assert.doesNotMatch(route, /console\.error/);
  }
});

test("the login page has a distinct message for each code, and never tells a visitor to retry our bug", async () => {
  const page = await readFile(path.join(ROOT, "app/login/page.tsx"), "utf8");
  assert.match(page, /_account_error/);
  assert.match(page, /_provider_error/);
  assert.match(page, /_denied/);

  // The account_error branch is the one the visitor cannot do anything about.
  const branch = page.slice(page.indexOf('_account_error'), page.indexOf('_provider_error'));
  assert.doesNotMatch(branch, /حاول مرة أخرى/);
});
