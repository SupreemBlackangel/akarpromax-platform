import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { startPairing, completePairing } from "../lib/integration/pairing.ts";
import { authenticateDeviceToken, rotateDeviceToken, revokeDevice, deviceHasScope, listDevices } from "../lib/integration/device.ts";
import { sha256Hex } from "../lib/integration/crypto.ts";
import { checkProtocolVersion } from "../lib/integration/constants.ts";

const SPONSOR = "office@akarpromax.com";

test("sha256Hex is deterministic and non-reversible by shape", async () => {
  const a = await sha256Hex("secret-token");
  const b = await sha256Hex("secret-token");
  const c = await sha256Hex("other-token");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(a.length, 64);
});

test("pairing code is stored hashed and device receives scoped credential", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const pairing = await startPairing({ sponsorId: SPONSOR, officeId: "muscat-main" });
  assert.equal(pairing.code.length, 6);

  const codes = db.dump("office_pairing_codes");
  assert.equal(codes.length, 1);
  assert.notEqual(codes[0].code_hash, pairing.code, "plain code must not be stored");

  const device = await completePairing({
    code: pairing.code,
    installationId: "inst-001",
    deviceName: "Reception Kiosk",
    appVersion: "1.2.0",
    protocolVersion: 1,
  });
  assert.equal(device.status, "active");
  assert.equal(device.sponsorId, SPONSOR);
  assert.equal(device.officeId, "muscat-main");
  assert.match(device.token, /^apd_/);

  const devices = db.dump("office_devices");
  assert.equal(devices.length, 1);
  assert.equal(devices[0].status, "active");

  const credentials = db.dump("office_device_credentials");
  assert.equal(credentials.length, 1);
  assert.notEqual(credentials[0].token_hash, device.token, "raw token must never be stored");

  setIntegrationDbForTesting(null);
});

test("pairing code is single-use", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const pairing = await startPairing({ sponsorId: SPONSOR });
  await completePairing({ code: pairing.code, installationId: "inst-a", appVersion: "1.2.0" });
  await assert.rejects(
    completePairing({ code: pairing.code, installationId: "inst-b", appVersion: "1.2.0" }),
    /PAIRING_CODE_USED/,
  );
  setIntegrationDbForTesting(null);
});

test("authenticated token resolves device with scopes and heartbeat updates last_seen", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const pairing = await startPairing({ sponsorId: SPONSOR });
  const device = await completePairing({ code: pairing.code, installationId: "inst-heartbeat", appVersion: "1.2.0" });

  const authenticated = await authenticateDeviceToken(device.token);
  assert.ok(authenticated);
  assert.equal(authenticated.deviceId, device.deviceId);
  assert.equal(authenticated.sponsorId, SPONSOR);
  assert.ok(deviceHasScope(authenticated, "office.sync"));
  assert.ok(deviceHasScope(authenticated, "office.news.read"));
  assert.ok(!deviceHasScope(authenticated, "office.master"));

  const devices = db.dump("office_devices");
  assert.ok(devices[0].last_seen_at, "heartbeat must stamp last_seen_at");

  setIntegrationDbForTesting(null);
});

test("rotation revokes old credential and issues a new one", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const pairing = await startPairing({ sponsorId: SPONSOR });
  const device = await completePairing({ code: pairing.code, installationId: "inst-rotate", appVersion: "1.2.0" });

  const rotated = await rotateDeviceToken(device.token);
  assert.match(rotated.token, /^apd_/);
  assert.notEqual(rotated.token, device.token);

  assert.equal(await authenticateDeviceToken(device.token), null, "old token must be dead after rotation");
  const newAuth = await authenticateDeviceToken(rotated.token);
  assert.ok(newAuth);
  assert.equal(newAuth.deviceId, device.deviceId);

  const credentials = db.dump("office_device_credentials");
  assert.equal(credentials.length, 2);
  assert.equal(credentials.filter((c) => c.revoked_at).length, 1);

  setIntegrationDbForTesting(null);
});

test("revoke device kills all its credentials and marks status", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const pairing = await startPairing({ sponsorId: SPONSOR });
  const device = await completePairing({ code: pairing.code, installationId: "inst-revoke", appVersion: "1.2.0" });

  const result = await revokeDevice(device.deviceId, "security");
  assert.equal(result.revoked, true);
  assert.equal(await authenticateDeviceToken(device.token), null);

  const devices = await listDevices(SPONSOR);
  assert.equal(devices.length, 1);
  assert.equal(devices[0].status, "revoked");
  assert.equal(devices[0].revoked_reason, "security");

  setIntegrationDbForTesting(null);
});

test("pairing + auth flow is reflected in api route source", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../app/api/office/v1/pairing/complete/route.ts", import.meta.url), "utf8");
  assert.match(source, /checkProtocolVersion/);
  assert.match(source, /completePairing/);
  assert.match(source, /office_pairing_complete/);
  const authSource = await readFile(new URL("../lib/integration/office-auth.ts", import.meta.url), "utf8");
  assert.match(authSource, /authenticateDeviceToken/);
  assert.match(authSource, /UPDATE_REQUIRED/);
});

test("protocol gate rejects a blocked client at the api layer", () => {
  const result = checkProtocolVersion("0.9.0", 2);
  assert.equal(result.status, "BLOCKED");
});
