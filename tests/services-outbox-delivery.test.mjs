// The outbox has a postman now.
//
// processOutbox() used to mark every event "processed" and send nothing.
// Production had 31 events sitting in it — 31 times a craftsman was never told
// a job was waiting, because the in-app notification only reaches someone who
// already opened the platform. WhatsApp is not connected, so email is the
// channel.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { renderEmail } from "../lib/email/templates.ts";
import { outboxRecipient } from "../lib/services/marketplace.ts";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");
/** Assert on executable code, not on the prose that explains it. */
const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*(\/\/|\*).*$/gm, "");

// ---- the letter ------------------------------------------------------------

test("a notification email carries the words the event already wrote", () => {
  const rendered = renderEmail("ar", "notification", {
    brandTitle: "AkarProMax",
    brandUrl: "https://akarpromax.com",
    notificationTitle: "طلب جديد يناسب خدماتك",
    notificationBody: "وجدنا طلباً جديداً مطابقاً لخدماتك — يمكنك تقديم عرض.",
    notificationUrl: "https://akarpromax.com/service-requests/abc",
    notificationCta: "افتح الطلب",
  });

  // The subject is the event's own sentence, not a generic one: a craftsman
  // decides whether to open the mail from the subject line alone.
  assert.equal(rendered.subject, "طلب جديد يناسب خدماتك");
  assert.match(rendered.html, /يمكنك تقديم عرض/);
  assert.match(rendered.html, /service-requests\/abc/);
  assert.match(rendered.text, /service-requests\/abc/);
});

test("a notification with no words of its own still sends something readable", () => {
  const rendered = renderEmail("ar", "notification", { brandTitle: "AkarProMax", brandUrl: "https://akarpromax.com" });
  assert.ok(rendered.subject.trim().length > 0);
  assert.doesNotMatch(rendered.subject, /undefined|null/);
  assert.doesNotMatch(rendered.html, /undefined|null/);
});

test("every locale can carry one", () => {
  for (const locale of ["ar", "en", "tr"]) {
    const rendered = renderEmail(locale, "notification", {
      brandTitle: "AkarProMax", brandUrl: "https://akarpromax.com", notificationTitle: "T", notificationBody: "B",
    });
    assert.equal(rendered.subject, "T", locale);
    assert.match(rendered.html, /B/, locale);
  }
});

test("the title and body are escaped, so an event cannot inject markup", () => {
  const rendered = renderEmail("ar", "notification", {
    brandTitle: "AkarProMax", brandUrl: "https://akarpromax.com",
    notificationTitle: "<script>alert(1)</script>",
    notificationBody: "<img src=x onerror=alert(2)>",
  });
  // The angle brackets are what make markup; the words inside are inert text
  // once they are gone. Asserting on "onerror=" alone would fail on the escaped
  // string too, which proves nothing.
  assert.doesNotMatch(rendered.html, /<script>/);
  assert.doesNotMatch(rendered.html, /<img[\s>]/);
  assert.match(rendered.html, /&lt;script&gt;/);
  assert.match(rendered.html, /&lt;img src=x onerror=alert\(2\)&gt;/);
});

// ---- the address -----------------------------------------------------------

test("the recipient is read from the payload, whichever key the event used", () => {
  assert.equal(outboxRecipient({ providerUserId: "pro@example.com" }), "pro@example.com");
  assert.equal(outboxRecipient({ customerUserId: "cust@example.com" }), "cust@example.com");
  assert.equal(outboxRecipient({ recipientUserId: "r@example.com" }), "r@example.com");
  // The provider is preferred when an event names both — SERVICE_REQUEST_MATCHED
  // is addressed to the craftsman, and it carries the customer too.
  assert.equal(outboxRecipient({ customerUserId: "c@example.com", providerUserId: "p@example.com" }), "p@example.com");
});

test("a payload with no usable address sends nothing rather than throwing", () => {
  for (const payload of [{}, { providerUserId: "" }, { providerUserId: "not-an-email" }, { userId: 42 }, { customerUserId: null }]) {
    assert.equal(outboxRecipient(payload), null, JSON.stringify(payload));
  }
});

// ---- the postman ------------------------------------------------------------

test("processOutbox sends before it marks an event processed", async () => {
  const source = strip(await read("lib/services/marketplace.ts"));
  assert.match(source, /await deliverOutboxEvent\(event\);\s*\n\s*await db/);
  assert.match(source, /emailService\.send\("notification"/);
  // A failure marks the event failed with its reason, and the batch goes on.
  assert.match(source, /SET status = 'failed', error = \?1, attempts = attempts \+ 1/);
});

test("publishing kicks the drain without making the customer wait for it", async () => {
  const source = strip(await read("lib/services/marketplace.ts"));
  assert.match(source, /void processOutbox\(\)\.catch/);
});

test("the drain endpoint is closed to everyone but an admin and the server's cron", async () => {
  const source = strip(await read("app/api/service-outbox/drain/route.ts"));
  assert.match(source, /SERVICE_OUTBOX_SECRET/);
  assert.match(source, /hasSponsorPermission\(identity, PERMISSIONS\.SERVICE_REQUESTS_MANAGE_ALL\)/);
  // An unset secret must never mean "anyone may drain the queue".
  assert.match(source, /if \(!expected\) return false;/);
  // And the comparison must not leak the secret through its own timing.
  assert.match(source, /diff \|= expected\.charCodeAt\(i\) \^ given\.charCodeAt\(i\)/);
});
