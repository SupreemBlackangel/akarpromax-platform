import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { registerOrTouchDevice } from "../lib/integration/device.ts";
import { listOfficeDeviceNotifications, markAllOfficeNotificationsRead, markOfficeNotificationRead } from "../lib/integration/notifications.ts";
import { announceToOffices, listOfficeSponsors, notifyOffice } from "../lib/integration/office-notify.ts";

const OFFICE = "Office@AkarPromax.com";
const OTHER = "other@akarpromax.com";

async function pairDevice(sponsorId, installationId) {
  await registerOrTouchDevice({ sponsorId, officeId: null, installationId, deviceName: "desk", model: "Desktop", os: "Windows", osVersion: "10", appVersion: "3.0.0", lastIp: null, createdBy: sponsorId });
}

test("an office is addressed by its lowercase email and reads only its own desktop deliveries", async () => {
  setIntegrationDbForTesting(createInMemoryDb());

  assert.equal(await notifyOffice({ sponsorEmail: OFFICE, eventType: "message.new", eventId: "thread:1", title: "رسالة", body: "نص", link: "app://messages" }), true);
  assert.equal(await notifyOffice({ sponsorEmail: OTHER, eventType: "ad.approved", eventId: "ad:9:approved", title: "إعلان", body: "اعتُمد" }), true);
  assert.equal(await notifyOffice({ sponsorEmail: "not-an-email", eventType: "ad.approved", eventId: "x", title: "t", body: "b" }), false);

  const mine = await listOfficeDeviceNotifications(OFFICE.toLowerCase());
  assert.equal(mine.length, 1);
  assert.equal(mine[0].channel, "office_desktop");
  assert.equal(mine[0].link, "app://messages");
  assert.equal((await listOfficeDeviceNotifications(OTHER)).length, 1);

  setIntegrationDbForTesting(null);
});

test("the same event never rings twice", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const input = { sponsorEmail: OFFICE, eventType: "ad.approved", eventId: "ad:1:approved", title: "t", body: "b" };
  await notifyOffice(input);
  await notifyOffice(input);
  assert.equal((await listOfficeDeviceNotifications(OFFICE.toLowerCase())).length, 1);
  setIntegrationDbForTesting(null);
});

test("reading is scoped to the office; mark-all clears only that office's unread", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const me = OFFICE.toLowerCase();
  await notifyOffice({ sponsorEmail: me, eventType: "admin.announcement", eventId: "a1", title: "1", body: "b" });
  await notifyOffice({ sponsorEmail: me, eventType: "admin.announcement", eventId: "a2", title: "2", body: "b" });
  await notifyOffice({ sponsorEmail: OTHER, eventType: "admin.announcement", eventId: "a3", title: "3", body: "b" });

  const [first] = await listOfficeDeviceNotifications(me);
  assert.equal(await markOfficeNotificationRead(String(first.id), OTHER), false, "another office cannot mark mine");
  assert.equal(await markOfficeNotificationRead(String(first.id), me), true);
  assert.equal((await listOfficeDeviceNotifications(me)).length, 1);

  assert.equal(await markAllOfficeNotificationsRead(me), 1);
  assert.equal((await listOfficeDeviceNotifications(me)).length, 0);
  assert.equal((await listOfficeDeviceNotifications(OTHER)).length, 1, "the other office's unread is untouched");
  assert.equal((await listOfficeDeviceNotifications(me, undefined, "delivered")).length, 2);

  setIntegrationDbForTesting(null);
});

test("an announcement reaches every office with an active device, once each", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await pairDevice(OFFICE.toLowerCase(), "inst-1");
  await pairDevice(OFFICE.toLowerCase(), "inst-2");
  await pairDevice(OTHER, "inst-3");

  const sponsors = await listOfficeSponsors();
  assert.deepEqual([...sponsors].sort(), [OFFICE.toLowerCase(), OTHER].sort());

  const sent = await announceToOffices({ title: "صيانة", body: "الليلة", announcementId: "announce:1" });
  assert.equal(sent, 2);
  assert.equal((await listOfficeDeviceNotifications(OFFICE.toLowerCase())).length, 1);
  assert.equal((await listOfficeDeviceNotifications(OTHER)).length, 1);

  const one = await announceToOffices({ sponsorEmail: OTHER, title: "لك وحدك", body: "نص", announcementId: "announce:2" });
  assert.equal(one, 1);
  assert.equal((await listOfficeDeviceNotifications(OFFICE.toLowerCase())).length, 1);
  assert.equal((await listOfficeDeviceNotifications(OTHER)).length, 2);

  setIntegrationDbForTesting(null);
});
