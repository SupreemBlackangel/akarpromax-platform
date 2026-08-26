import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import {
  isThreadParticipant,
  listInbox,
  markThreadRead,
  resolveRecipientUserId,
  sendMessageFull,
  startMessageThread,
  threadMessages,
} from "../lib/services/marketplace.ts";
import { MESSAGE_CONTEXT, isMessageContext, messageContextLabel, contextLinkFor } from "../lib/services/message-contexts.ts";

const SEVEN_CONTEXTS = ["general", "property", "property_request", "request", "order", "professional", "organization"];

test.beforeEach(() => {
  setServicesDbForTesting(createInMemoryDb());
});

test.afterEach(() => {
  setServicesDbForTesting(null);
});

test("messaging contract: one core, seven contexts, legacy values preserved", async () => {
  const [marketplace, contexts, schema, threadsRoute, sendRoute, threadDetailRoute, identity, core, inboxPage, threadUi, startButton] = await Promise.all([
    readFile(new URL("../lib/services/marketplace.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/services/message-contexts.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/services-marketplace-schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-messages/threads/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-messages/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-messages/threads/[threadType]/[threadId]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/services/identity.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/services/core.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/services/inbox/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/services/ThreadMessages.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/services/StartThreadButton.tsx", import.meta.url), "utf8"),
  ]);

  for (const ctx of SEVEN_CONTEXTS) {
    assert.match(contexts, new RegExp(`"${ctx}"`), `missing context ${ctx} in message-contexts`);
  }
  assert.match(contexts, /SERVICE_REQUEST: "request"/, "SERVICE_REQUEST must keep legacy storage value request");
  assert.match(contexts, /SERVICE_JOB: "order"/, "SERVICE_JOB must keep legacy storage value order");

  for (const fn of ["sendMessageFull", "threadMessages", "markThreadRead", "listInbox", "isThreadParticipant", "startMessageThread", "resolveRecipientUserId", "ensureMessageParticipant", "ensureContextThread"]) {
    assert.match(marketplace, new RegExp(`export async function ${fn}`), `missing ${fn} in shared messaging core`);
  }
  assert.match(marketplace, /service_message_threads/, "core must reference thread metadata table");
  assert.match(marketplace, /service_message_participants/, "core must reference participants table");
  assert.doesNotMatch(marketplace, /getSponsorIdentity|requireChatGPTUser/, "messaging core must not use legacy identity");

  assert.match(schema, /CREATE TABLE IF NOT EXISTS service_message_threads/, "threads table missing from schema");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS service_message_participants/, "participants table missing from schema");

  assert.match(threadsRoute, /startMessageThread/, "threads route must expose thread start");
  assert.match(threadsRoute, /isMessageContext/, "threads route must validate the 7-context set");
  assert.match(sendRoute, /isThreadParticipant/, "send route must enforce server-side participant authz");
  assert.match(sendRoute, /resolveRecipientUserId/, "send route must resolve recipient via shared core");
  assert.match(threadDetailRoute, /isMessageContext/, "thread detail route must validate context");
  assert.match(threadDetailRoute, /isThreadParticipant/, "thread detail route must enforce participant authz");
  assert.doesNotMatch(sendRoute, /getSponsorIdentity/, "send route must use canonical identity");

  assert.match(identity, /UPDATE service_message_participants SET user_id/, "identity rekey must cover participants");
  assert.match(core, /import\("@services\/marketplace"\)/, "core.ts must delegate messages to the single shared core");

  assert.match(inboxPage, /messageContextLabel/, "central inbox must label all seven contexts");
  assert.match(inboxPage, /"open"/, "central inbox must deep-link via open param");
  assert.match(threadUi, /messageContextLabel/, "composer must show context label");
  assert.match(startButton, /api\/service-messages\/threads/, "entry point must start threads via the shared core");
});

test("legacy request threads keep working with derived participants, isolated per provider", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_requests", [{ id: "r1", customer_user_id: "customer@x.com" }]);
  db.seed("service_offers", [{ id: "o1", request_id: "r1", provider_user_id: "provider@x.com", status: "sent" }]);

  // threadId is "{requestId}:{providerUserId}" — one isolated conversation
  // per bidding provider, not one shared thread per request (that shared
  // shape was a confirmed cross-provider leak — see the regression test
  // below).
  const threadId = "r1:provider@x.com";
  assert.equal(await isThreadParticipant("request", threadId, "customer@x.com"), true);
  assert.equal(await isThreadParticipant("request", threadId, "provider@x.com"), true);
  assert.equal(await isThreadParticipant("request", threadId, "outsider@x.com"), false);
  assert.equal(await resolveRecipientUserId("request", threadId, "provider@x.com"), "customer@x.com");

  const id = await sendMessageFull({ threadType: "request", threadId, senderUserId: "provider@x.com", body: "مرحبا", recipientUserId: "customer@x.com" });
  assert.ok(id);

  const messages = await threadMessages("request", threadId);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].body, "مرحبا");

  const customerInbox = await listInbox("customer@x.com");
  assert.equal(customerInbox.length, 1);
  assert.equal(customerInbox[0].thread_type, "request");
  assert.equal(customerInbox[0].thread_id, threadId);
  assert.equal(customerInbox[0].message_count, 1);
  assert.equal(customerInbox[0].unread_count, 1);

  const providerInbox = await listInbox("provider@x.com");
  assert.equal(providerInbox.length, 1);
  assert.equal(providerInbox[0].unread_count, 0);

  await markThreadRead("request", threadId, "customer@x.com");
  const readInbox = await listInbox("customer@x.com");
  assert.equal(readInbox[0].unread_count, 0);
});

test("SECURITY REGRESSION: a competing provider cannot read another provider's request conversation", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_requests", [{ id: "r1", customer_user_id: "customer@x.com" }]);
  db.seed("service_offers", [
    { id: "o1", request_id: "r1", provider_user_id: "p1@x.com", status: "sent" },
    { id: "o2", request_id: "r1", provider_user_id: "p2@x.com", status: "sent" },
  ]);

  const p1Thread = "r1:p1@x.com";
  await sendMessageFull({ threadType: "request", threadId: p1Thread, senderUserId: "p1@x.com", body: "سعري الخاص", recipientUserId: "customer@x.com" });

  // p2 is a legitimate bidder on the SAME request, but must not be able to
  // read p1's conversation with the customer.
  assert.equal(await isThreadParticipant("request", p1Thread, "p2@x.com"), false);
  const p2Inbox = await listInbox("p2@x.com");
  assert.ok(!p2Inbox.some((t) => t.thread_id === p1Thread), "p2's inbox must not contain p1's thread");

  const p2Thread = "r1:p2@x.com";
  assert.equal(await isThreadParticipant("request", p2Thread, "p1@x.com"), false);
});

test("legacy order threads keep deriving both sides", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_orders", [{ id: "j1", customer_user_id: "a@x.com", provider_user_id: "b@x.com" }]);

  assert.equal(await isThreadParticipant("order", "j1", "a@x.com"), true);
  assert.equal(await isThreadParticipant("order", "j1", "b@x.com"), true);
  assert.equal(await isThreadParticipant("order", "j1", "c@x.com"), false);
  assert.equal(await resolveRecipientUserId("order", "j1", "a@x.com"), "b@x.com");
  assert.equal(await resolveRecipientUserId("order", "j1", "b@x.com"), "a@x.com");

  await sendMessageFull({ threadType: "order", threadId: "j1", senderUserId: "a@x.com", body: "ابدأ المهمة", recipientUserId: "b@x.com" });
  const inbox = await listInbox("b@x.com");
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].thread_type, "order");
});

test("organization context: start thread seeds participants, metadata and authz", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());

  const thread = await startMessageThread({
    threadType: "organization",
    threadId: "org1",
    title: "شركة البناء",
    contextLink: "/companies/org1",
    participantIds: ["owner@x.com"],
    actorUserId: "me@x.com",
  });
  assert.equal(thread.threadType, "organization");
  assert.equal(thread.title, "شركة البناء");

  assert.equal(await isThreadParticipant("organization", "org1", "me@x.com"), true);
  assert.equal(await isThreadParticipant("organization", "org1", "owner@x.com"), true);
  assert.equal(await isThreadParticipant("organization", "org1", "outsider@x.com"), false);
  assert.equal(await resolveRecipientUserId("organization", "org1", "me@x.com"), "owner@x.com");

  await sendMessageFull({ threadType: "organization", threadId: "org1", senderUserId: "me@x.com", body: "استفسار", recipientUserId: "owner@x.com" });

  const ownerInbox = await listInbox("owner@x.com");
  assert.equal(ownerInbox.length, 1);
  assert.equal(ownerInbox[0].thread_type, "organization");
  assert.equal(ownerInbox[0].title, "شركة البناء");
  assert.equal(ownerInbox[0].context_link, "/companies/org1");
  assert.equal(ownerInbox[0].unread_count, 1);

  const myInbox = await listInbox("me@x.com");
  assert.equal(myInbox.length, 1);
  assert.equal(myInbox[0].unread_count, 0);

  await markThreadRead("organization", "org1", "owner@x.com");
  assert.equal((await listInbox("owner@x.com"))[0].unread_count, 0);

  const participants = db.dump("service_message_participants");
  assert.equal(participants.length, 2);
  assert.deepEqual(participants.map((p) => p.user_id).sort(), ["me@x.com", "owner@x.com"]);

  const meta = db.dump("service_message_threads");
  assert.equal(meta.length, 1);
  assert.equal(meta[0].thread_type, "organization");
  assert.equal(meta[0].context_link, "/companies/org1");
});

test("professional context: profile owner is an implicit participant", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  db.seed("service_provider_profiles", [{ id: "prof1", user_id: "provider@x.com" }]);

  await startMessageThread({ threadType: "professional", threadId: "prof1", title: "مقاول", participantIds: [], actorUserId: "client@x.com" });

  assert.equal(await isThreadParticipant("professional", "prof1", "client@x.com"), true);
  assert.equal(await isThreadParticipant("professional", "prof1", "provider@x.com"), true);
  assert.equal(await isThreadParticipant("professional", "prof1", "outsider@x.com"), false);
  assert.equal(await resolveRecipientUserId("professional", "prof1", "client@x.com"), "provider@x.com");
});

test("general and property contexts use participant seeding", async () => {
  setServicesDbForTesting(createInMemoryDb());
  await startMessageThread({ threadType: "general", threadId: "g1", title: "عام", participantIds: ["friend@x.com"], actorUserId: "me@x.com" });
  await startMessageThread({ threadType: "property", threadId: "prop1", title: "فيلا للبيع", contextLink: "/properties/prop1", participantIds: ["agent@x.com"], actorUserId: "me@x.com" });

  for (const ctx of ["general", "property"]) {
    assert.equal(await isThreadParticipant(ctx, ctx === "general" ? "g1" : "prop1", "me@x.com"), true, `${ctx}: sender participant`);
    assert.equal(await isThreadParticipant(ctx, ctx === "general" ? "g1" : "prop1", "outsider@x.com"), false, `${ctx}: outsider denied`);
  }

  await sendMessageFull({ threadType: "property", threadId: "prop1", senderUserId: "me@x.com", body: "كم السعر؟", recipientUserId: "agent@x.com" });
  const inbox = await listInbox("agent@x.com");
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].thread_type, "property");
  assert.equal(inbox[0].context_link, "/properties/prop1");
});

test("context contract helpers cover all seven contexts", () => {
  for (const ctx of SEVEN_CONTEXTS) {
    assert.equal(isMessageContext(ctx), true, `${ctx} must be accepted`);
    assert.ok(messageContextLabel(ctx, "ar").length > 0, `${ctx} must have an Arabic label`);
    assert.ok(contextLinkFor(ctx, "x1").length > 0, `${ctx} must resolve a context link`);
  }
  assert.equal(isMessageContext("bogus"), false);
  assert.equal(isMessageContext(undefined), false);
  assert.equal(contextLinkFor("request", "r1"), "/service-requests/r1");
  assert.equal(contextLinkFor("order", "j1"), "/dashboard/services/jobs/j1");
  assert.equal(MESSAGE_CONTEXT.SERVICE_REQUEST, "request");
  assert.equal(MESSAGE_CONTEXT.SERVICE_JOB, "order");
});
