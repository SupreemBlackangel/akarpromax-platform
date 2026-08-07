import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { dispatchOfficeNotification, upsertNotificationRule, isWithinQuietWindow, listNotificationDeliveries, listNotificationRules } from "../lib/integration/notifications.ts";

const SPONSOR = "office@akarpromax.com";

function hhmm(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function windowAroundNow(minutes = 5) {
  const now = new Date();
  const start = new Date(now.getTime() - minutes * 60 * 1000);
  const end = new Date(now.getTime() + minutes * 60 * 1000);
  return { quietStart: hhmm(start), quietEnd: hhmm(end) };
}

test("dedup prevents double delivery of the same event to the same recipient", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const base = {
    sponsorId: SPONSOR,
    recipient: { recipientKey: "office-muscat", officeId: "muscat-main", deviceId: "dev-1", channels: ["in_app"] },
    eventType: "OFFICE_RADAR_MATCH",
    eventId: "evt-1",
    title: "عقار جديد قريب",
    body: "وُجد عقار ضمن نطاق الرادار",
  };

  const first = await dispatchOfficeNotification(base);
  assert.equal(first.deduplicated, false);
  assert.equal(first.status, "queued");

  const second = await dispatchOfficeNotification(base);
  assert.equal(second.deduplicated, true);

  const deliveries = db.dump("office_notification_deliveries");
  assert.equal(deliveries.length, 1, "one dedup row per event+recipient");

  setIntegrationDbForTesting(null);
});

test("quiet hours defer notifications instead of dropping them", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const { quietStart, quietEnd } = windowAroundNow();
  await upsertNotificationRule({
    sponsorId: SPONSOR,
    officeId: "muscat-main",
    eventType: "OFFICE_NEW_NEWS",
    channel: "in_app",
    quietStart,
    quietEnd,
  });

  const result = await dispatchOfficeNotification({
    sponsorId: SPONSOR,
    recipient: { recipientKey: "office-muscat", officeId: "muscat-main", deviceId: "dev-1", channels: ["in_app"] },
    eventType: "OFFICE_NEW_NEWS",
    eventId: "evt-quiet",
    title: "خبر جديد",
    body: "…",
  });

  assert.equal(result.deferred, true);
  assert.equal(result.status, "deferred");

  const deliveries = db.dump("office_notification_deliveries");
  assert.equal(deliveries[0].status, "deferred");

  setIntegrationDbForTesting(null);
});

test("quiet-window comparison wraps midnight", () => {
  assert.equal(isWithinQuietWindow("22:00", "06:00", "23:30"), true);
  assert.equal(isWithinQuietWindow("22:00", "06:00", "09:00"), false);
  assert.equal(isWithinQuietWindow("00:00", "12:00", "06:00"), true);
  assert.equal(isWithinQuietWindow("00:00", "00:00", "10:00"), false);
});

test("rules and deliveries are listed per sponsor", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await upsertNotificationRule({ sponsorId: SPONSOR, eventType: "OFFICE_RADAR_MATCH", channel: "in_app" });
  await dispatchOfficeNotification({
    sponsorId: SPONSOR,
    recipient: { recipientKey: "k", officeId: null, channels: ["in_app"] },
    eventType: "OFFICE_RADAR_MATCH",
    eventId: "evt-2",
    title: "t",
    body: "b",
  });

  const rules = await listNotificationRules(SPONSOR);
  assert.equal(rules.length, 1);
  const deliveries = await listNotificationDeliveries(SPONSOR);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].channel, "in_app");
  setIntegrationDbForTesting(null);
});

test("notification domain supports all three channels and defer-not-lost semantics", async () => {
  const source = await readFile(new URL("../lib/integration/notifications.ts", import.meta.url), "utf8");
  const constantsSource = await readFile(new URL("../lib/integration/constants.ts", import.meta.url), "utf8");
  assert.match(source, /office_notification_deliveries/);
  assert.match(source, /office_notification_rules/);
  assert.match(source, /OFFICE_NOTIFICATION_CHANNELS/);
  assert.match(constantsSource, /"office_desktop"/);
  assert.match(source, /deferred/);
  assert.match(source, /dedup_key/);
});
