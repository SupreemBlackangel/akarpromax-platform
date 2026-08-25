// Phase 3B — Office property media.
//
// Bytes land in the canonical asset bucket, rows land in the canonical
// property_media model, ownership comes from the authenticated device, and a
// retry never produces a second image.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { createInMemoryBucket, jpegBytes, pngBytes, scriptBytes } from "./helpers/in-memory-bucket.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { setOfficeMediaBucketForTesting } from "../lib/integration/office-media-store.ts";
import { startPairing, completePairing } from "../lib/integration/pairing.ts";
import { OFFICE_MEDIA_MAX_BYTES, isValidOfficeMediaObjectKey } from "../lib/integration/office-media.ts";
import { POST as syncPost } from "../app/api/office/v1/sync/route.ts";
import { GET as mediaGet, POST as mediaPost } from "../app/api/office/v1/media/route.ts";

const SPONSOR_A = "office-a@akarpromax.com";
const SPONSOR_B = "office-b@akarpromax.com";
const MEDIA_URL = "https://akarpromax.com/api/office/v1/media";
const SYNC_URL = "https://akarpromax.com/api/office/v1/sync";

function headers(token, extra = {}) {
  return { authorization: `Bearer ${token}`, "x-protocol-version": "1", "x-app-version": "1.2.0", ...extra };
}

function mediaRequest(token, action, fields, file) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, String(value));
  if (file) form.set("image", file.blob, file.name);
  const url = `${MEDIA_URL}?action=${action}`;
  return new Request(url, { method: "POST", headers: headers(token), body: form });
}

function imageFile(bytes, name = "photo.png", type = "image/png") {
  return { blob: new Blob([bytes], { type }), name };
}

async function pair(sponsorId, installationId) {
  const pairing = await startPairing({ sponsorId, officeId: "main" });
  return completePairing({ code: pairing.code, installationId, deviceName: "Office PC", appVersion: "1.2.0", protocolVersion: 1 });
}

async function publishProperty(token, entityId = "local-42") {
  const request = new Request(SYNC_URL, {
    method: "POST",
    headers: { ...headers(token), "content-type": "application/json" },
    body: JSON.stringify({
      items: [{
        operationType: "property.upsert",
        entityId,
        payload: {
          titleAr: "شقة فاخرة", descriptionAr: "وصف كامل للعقار مع تفاصيل كافية.",
          dealType: "sale", category: "residential", propertyType: "apartment",
          country: "OM", governorate: "محافظة مسقط", city: "مسقط",
          price: 95000, area: 180,
        },
        clientUpdatedAt: "2030-01-01 00:00:00",
        idempotencyKey: `prop-${entityId}`,
      }],
    }),
  });
  request.nextUrl = new URL(SYNC_URL);
  const response = await syncPost(request);
  const body = await response.json();
  return body.items[0].propertyId;
}

async function upload(token, fields, file) {
  const response = await mediaPost(mediaRequest(token, "upload", fields, file));
  return { status: response.status, body: await response.json() };
}

function setup() {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const bucket = createInMemoryBucket();
  setOfficeMediaBucketForTesting(bucket);
  return { db, bucket };
}

test.afterEach(() => {
  setIntegrationDbForTesting(null);
  setOfficeMediaBucketForTesting(null);
});

// ---- authentication --------------------------------------------------------

test("a media upload with no device token is rejected with 401", async () => {
  setup();
  const form = new FormData();
  form.set("entityId", "local-42");
  const response = await mediaPost(new Request(`${MEDIA_URL}?action=upload`, { method: "POST", body: form }));
  assert.equal(response.status, 401);
});

test("a media upload with an invalid device token is rejected with 401", async () => {
  setup();
  const { status, body } = await upload("apd_not_a_real_token", { entityId: "local-42", mediaKey: "m1" }, imageFile(pngBytes()));
  assert.equal(status, 401);
  assert.equal(body.reason, "INVALID");
});

// ---- upload ----------------------------------------------------------------

test("the owning device uploads an image, the bytes are stored and a canonical row is created", async () => {
  const { db, bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  const propertyId = await publishProperty(device.token);

  const bytes = pngBytes("first-image");
  const { status, body } = await upload(device.token, { entityId: "local-42", mediaKey: "p42-a1", altText: "واجهة" }, imageFile(bytes));

  assert.equal(status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.propertyId, propertyId);
  assert.equal(body.data.created, true);

  const rows = db.dump("property_media");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].property_id, propertyId);
  assert.equal(rows[0].type, "image", "the canonical media type column stays image|video");
  assert.equal(rows[0].mime_type, "image/png");
  assert.equal(Number(rows[0].size), bytes.byteLength);
  assert.equal(rows[0].alt_text, "واجهة");

  // The bytes really landed in the bucket, and the row points at them.
  assert.equal(bucket.keys().length, 1);
  const objectKey = bucket.keys()[0];
  assert.ok(isValidOfficeMediaObjectKey(objectKey), objectKey);
  assert.deepEqual([...bucket.bytesOf(objectKey)], [...bytes]);
  assert.equal(rows[0].url, `/api/office/v1/media?key=${encodeURIComponent(objectKey)}`);
});

test("the stored object is served back publicly by key", async () => {
  const { bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);
  const bytes = pngBytes("served");
  await upload(device.token, { entityId: "local-42", mediaKey: "p42-a1" }, imageFile(bytes));

  const objectKey = bucket.keys()[0];
  const response = await mediaGet(new Request(`${MEDIA_URL}?key=${encodeURIComponent(objectKey)}`));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/png");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [...bytes]);
});

test("a media row never exposes a local Windows path", async () => {
  const { db } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);

  const { body } = await upload(
    device.token,
    { entityId: "local-42", mediaKey: "p42-a1" },
    { blob: new Blob([pngBytes()], { type: "image/png" }), name: "C:\\\\Users\\\\zak\\\\Pictures\\\\owner-id.png" },
  );

  const serialised = JSON.stringify(body) + JSON.stringify(db.dump("property_media"));
  assert.doesNotMatch(serialised, /C:\\\\/);
  assert.doesNotMatch(serialised, /Users/i);
  assert.doesNotMatch(serialised, /Pictures/i);
  assert.match(body.data.url, /^\/api\/office\/v1\/media\?key=office%2Fproperty-media%2F/);
});

// ---- idempotency -----------------------------------------------------------

test("re-uploading the same local image creates no second website image", async () => {
  const { db, bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);
  const bytes = pngBytes("same");

  const first = await upload(device.token, { entityId: "local-42", mediaKey: "p42-a1" }, imageFile(bytes));
  const retry = await upload(device.token, { entityId: "local-42", mediaKey: "p42-a1" }, imageFile(bytes));

  assert.equal(first.body.data.created, true);
  assert.equal(retry.body.data.created, false);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.data.mediaId, first.body.data.mediaId);
  assert.equal(db.dump("property_media").length, 1);
  assert.equal(bucket.keys().length, 1, "the same object key is reused");
});

test("a replay after a restart still resolves to the same media", async () => {
  const { db } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);

  const first = await upload(device.token, { entityId: "local-42", mediaKey: "p42-a1" }, imageFile(pngBytes()));
  // A restarted desktop replays the queued operation with the same identity.
  const replay = await upload(device.token, { entityId: "local-42", mediaKey: "p42-a1" }, imageFile(pngBytes()));
  const replayAgain = await upload(device.token, { entityId: "local-42", mediaKey: "p42-a1" }, imageFile(pngBytes()));

  assert.equal(replay.body.data.mediaId, first.body.data.mediaId);
  assert.equal(replayAgain.body.data.mediaId, first.body.data.mediaId);
  assert.equal(db.dump("property_media").length, 1);
});

test("an edited image keeps its identity but replaces the stored bytes", async () => {
  const { db, bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);

  const first = await upload(device.token, { entityId: "local-42", mediaKey: "p42-a1" }, imageFile(pngBytes("v1")));
  const edited = await upload(device.token, { entityId: "local-42", mediaKey: "p42-a1" }, imageFile(pngBytes("v2-longer")));

  assert.equal(edited.body.data.mediaId, first.body.data.mediaId);
  assert.equal(db.dump("property_media").length, 1);
  assert.equal(bucket.keys().length, 1);
  assert.deepEqual([...bucket.bytesOf(bucket.keys()[0])], [...pngBytes("v2-longer")]);
});

test("a different local image creates a second media row", async () => {
  const { db, bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);

  const first = await upload(device.token, { entityId: "local-42", mediaKey: "p42-a1" }, imageFile(pngBytes("one")));
  const second = await upload(device.token, { entityId: "local-42", mediaKey: "p42-a2" }, imageFile(jpegBytes("two"), "photo.jpg", "image/jpeg"));

  assert.notEqual(second.body.data.mediaId, first.body.data.mediaId);
  assert.equal(db.dump("property_media").length, 2);
  assert.equal(bucket.keys().length, 2);
  assert.equal(second.body.data.order, 1, "order is deterministic and increments");
});

// ---- ownership -------------------------------------------------------------

test("another sponsor cannot upload media to this property", async () => {
  const { db } = setup();
  const deviceA = await pair(SPONSOR_A, "inst-a");
  const deviceB = await pair(SPONSOR_B, "inst-b");
  await publishProperty(deviceA.token);

  const attack = await upload(deviceB.token, { entityId: "local-42", mediaKey: "p42-a1" }, imageFile(pngBytes()));

  assert.equal(attack.status, 404);
  assert.equal(attack.body.error, "PROPERTY_NOT_FOUND");
  assert.equal(db.dump("property_media").length, 0);
});

test("a desktop-supplied sponsor identity is ignored", async () => {
  const { db } = setup();
  const deviceA = await pair(SPONSOR_A, "inst-a");
  await pair(SPONSOR_B, "inst-b");
  await publishProperty(deviceA.token);

  await upload(deviceA.token, { entityId: "local-42", mediaKey: "p42-a1", sponsorId: SPONSOR_B, propertyId: "forged" }, imageFile(pngBytes()));

  const links = db.dump("office_property_media_links");
  assert.equal(links.length, 1);
  assert.equal(links[0].sponsor_id, SPONSOR_A, "ownership follows the authenticated device");
});

test("another sponsor cannot delete this property's media", async () => {
  const { db, bucket } = setup();
  const deviceA = await pair(SPONSOR_A, "inst-a");
  const deviceB = await pair(SPONSOR_B, "inst-b");
  await publishProperty(deviceA.token);
  await upload(deviceA.token, { entityId: "local-42", mediaKey: "p42-a1" }, imageFile(pngBytes()));

  const response = await mediaPost(mediaRequest(deviceB.token, "delete", { entityId: "local-42", mediaKey: "p42-a1" }));

  assert.equal(response.status, 404);
  assert.equal(db.dump("property_media").length, 1);
  assert.equal(bucket.keys().length, 1);
});

// ---- validation ------------------------------------------------------------

test("an unsupported media type is rejected", async () => {
  const { db, bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);

  const { status, body } = await upload(
    device.token,
    { entityId: "local-42", mediaKey: "p42-a1" },
    { blob: new Blob([pngBytes()], { type: "application/pdf" }), name: "deed.pdf" },
  );

  assert.equal(status, 415);
  assert.equal(body.error, "UNSUPPORTED_MEDIA_TYPE");
  assert.equal(db.dump("property_media").length, 0);
  assert.equal(bucket.keys().length, 0, "nothing is stored for a rejected upload");
});

test("a script disguised as an image is rejected by its signature", async () => {
  const { db, bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);

  const { status, body } = await upload(
    device.token,
    { entityId: "local-42", mediaKey: "p42-a1" },
    { blob: new Blob([scriptBytes()], { type: "image/png" }), name: "exploit.png" },
  );

  assert.equal(status, 415);
  assert.equal(body.error, "INVALID_FILE_SIGNATURE");
  assert.equal(db.dump("property_media").length, 0);
  assert.equal(bucket.keys().length, 0);
});

test("an empty file is rejected", async () => {
  const { bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);

  const { status, body } = await upload(
    device.token,
    { entityId: "local-42", mediaKey: "p42-a1" },
    { blob: new Blob([new Uint8Array(0)], { type: "image/png" }), name: "empty.png" },
  );

  assert.equal(status, 400);
  assert.equal(body.error, "EMPTY_FILE");
  assert.equal(bucket.keys().length, 0);
});

test("an oversize file is rejected", async () => {
  const { bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);

  const huge = new Uint8Array(OFFICE_MEDIA_MAX_BYTES + 1024);
  huge.set(pngBytes(), 0);
  const { status, body } = await upload(
    device.token,
    { entityId: "local-42", mediaKey: "p42-a1" },
    { blob: new Blob([huge], { type: "image/png" }), name: "huge.png" },
  );

  assert.equal(status, 413);
  assert.equal(body.error, "FILE_TOO_LARGE");
  assert.equal(bucket.keys().length, 0);
});

test("media for an entity that was never published is refused", async () => {
  const { bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");

  const { status, body } = await upload(device.token, { entityId: "never-published", mediaKey: "x1" }, imageFile(pngBytes()));

  assert.equal(status, 404);
  assert.equal(body.error, "PROPERTY_NOT_FOUND");
  assert.equal(bucket.keys().length, 0);
});

// ---- primary + order -------------------------------------------------------

test("at most one image is ever featured", async () => {
  const { db } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);

  await upload(device.token, { entityId: "local-42", mediaKey: "a1", isPrimary: "true" }, imageFile(pngBytes("1")));
  await upload(device.token, { entityId: "local-42", mediaKey: "a2", isPrimary: "true" }, imageFile(pngBytes("2")));
  await upload(device.token, { entityId: "local-42", mediaKey: "a3" }, imageFile(pngBytes("3")));

  const featured = db.dump("property_media").filter((row) => row.is_featured === true || row.is_featured === 1);
  assert.equal(featured.length, 1);
  assert.equal(db.dump("property_media").length, 3);
});

test("changing the primary image does not duplicate it", async () => {
  const { db, bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);
  const first = await upload(device.token, { entityId: "local-42", mediaKey: "a1", isPrimary: "true" }, imageFile(pngBytes("1")));
  const second = await upload(device.token, { entityId: "local-42", mediaKey: "a2" }, imageFile(pngBytes("2")));

  const response = await mediaPost(mediaRequest(device.token, "primary", { entityId: "local-42", mediaKey: "a2" }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.mediaId, second.body.data.mediaId);
  assert.equal(db.dump("property_media").length, 2);
  assert.equal(bucket.keys().length, 2);

  const rows = db.dump("property_media");
  assert.equal(rows.filter((row) => row.is_featured === true || row.is_featured === 1).length, 1);
  assert.equal(rows.find((row) => row.id === second.body.data.mediaId).is_featured, true);
  assert.equal(rows.find((row) => row.id === first.body.data.mediaId).is_featured, false);
});

test("reordering keeps every image attached to the same property and creates nothing", async () => {
  const { db } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  const propertyId = await publishProperty(device.token);
  const a1 = await upload(device.token, { entityId: "local-42", mediaKey: "a1" }, imageFile(pngBytes("1")));
  const a2 = await upload(device.token, { entityId: "local-42", mediaKey: "a2" }, imageFile(pngBytes("2")));

  const response = await mediaPost(mediaRequest(device.token, "reorder", { entityId: "local-42", mediaKeys: "a2,a1" }));
  const body = await response.json();

  assert.equal(body.data.ordered, 2);
  const rows = db.dump("property_media");
  assert.equal(rows.length, 2);
  assert.equal(Number(rows.find((row) => row.id === a2.body.data.mediaId).order), 0);
  assert.equal(Number(rows.find((row) => row.id === a1.body.data.mediaId).order), 1);
  assert.ok(rows.every((row) => row.property_id === propertyId));
});

test("the authenticated list returns a deterministic order", async () => {
  setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);
  await upload(device.token, { entityId: "local-42", mediaKey: "a1" }, imageFile(pngBytes("1")));
  await upload(device.token, { entityId: "local-42", mediaKey: "a2" }, imageFile(pngBytes("2")));
  await mediaPost(mediaRequest(device.token, "reorder", { entityId: "local-42", mediaKeys: "a2,a1" }));

  const response = await mediaGet(new Request(`${MEDIA_URL}?entityId=local-42`, { headers: headers(device.token) }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data.map((item) => item.mediaKey), ["a2", "a1"]);
  assert.deepEqual(body.data.map((item) => item.order), [0, 1]);
});

// ---- delete ----------------------------------------------------------------

test("the owner deletes its own media, row and object both go", async () => {
  const { db, bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);
  await upload(device.token, { entityId: "local-42", mediaKey: "a1" }, imageFile(pngBytes()));

  const response = await mediaPost(mediaRequest(device.token, "delete", { entityId: "local-42", mediaKey: "a1" }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.changed, true);
  assert.equal(body.data.storageRemoved, true);
  assert.equal(db.dump("property_media").length, 0);
  assert.equal(bucket.keys().length, 0);
});

test("a repeated delete is safe", async () => {
  const { db } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);
  await upload(device.token, { entityId: "local-42", mediaKey: "a1" }, imageFile(pngBytes()));

  const first = await mediaPost(mediaRequest(device.token, "delete", { entityId: "local-42", mediaKey: "a1" }));
  const second = await mediaPost(mediaRequest(device.token, "delete", { entityId: "local-42", mediaKey: "a1" }));
  const never = await mediaPost(mediaRequest(device.token, "delete", { entityId: "local-42", mediaKey: "never-uploaded" }));

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).data.changed, false);
  assert.equal(never.status, 200);
  assert.equal(db.dump("property_media").length, 0);
});

test("a storage delete failure is reported rather than silently swallowed", async () => {
  const { db, bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);
  await upload(device.token, { entityId: "local-42", mediaKey: "a1" }, imageFile(pngBytes()));

  bucket.failNextDelete = true;
  const response = await mediaPost(mediaRequest(device.token, "delete", { entityId: "local-42", mediaKey: "a1" }));
  const body = await response.json();

  assert.equal(body.data.changed, true);
  assert.equal(body.data.storageRemoved, false, "the caller is told the object survived");
  assert.equal(db.dump("property_media").length, 0);
});

test("a storage write failure leaves no half-created media", async () => {
  const { db, bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);

  bucket.failNextPut = true;
  await assert.rejects(() => upload(device.token, { entityId: "local-42", mediaKey: "a1" }, imageFile(pngBytes())));

  assert.equal(db.dump("property_media").length, 0);
  assert.equal(bucket.keys().length, 0);
});

// ---- privacy ---------------------------------------------------------------

test("a private office document can never enter the property media store", async () => {
  const { db, bucket } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  await publishProperty(device.token);

  const documents = [
    { name: "title-deed.pdf", type: "application/pdf" },
    { name: "owner-id-scan.pdf", type: "application/pdf" },
    { name: "court-authorization.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    { name: "client-contract.doc", type: "application/msword" },
    { name: "crm-notes.txt", type: "text/plain" },
    { name: "deed.kmz", type: "application/vnd.google-earth.kmz" },
  ];

  for (const document of documents) {
    const { status, body } = await upload(
      device.token,
      { entityId: "local-42", mediaKey: `doc-${document.name}` },
      { blob: new Blob([new TextEncoder().encode("PRIVATE")], { type: document.type }), name: document.name },
    );
    assert.equal(status, 415, document.name);
    assert.equal(body.error, "UNSUPPORTED_MEDIA_TYPE", document.name);
  }

  assert.equal(db.dump("property_media").length, 0);
  assert.equal(bucket.keys().length, 0);
  assert.doesNotMatch(JSON.stringify(db.dump("office_property_media_links")), /PRIVATE|deed|authorization/i);
});

// ---- the canonical public surface ------------------------------------------

test("the uploaded row is exactly what the public property response reads", async () => {
  const { db } = setup();
  const device = await pair(SPONSOR_A, "inst-a");
  const propertyId = await publishProperty(device.token);
  await upload(device.token, { entityId: "local-42", mediaKey: "a1", isPrimary: "true" }, imageFile(pngBytes("hero")));
  await upload(device.token, { entityId: "local-42", mediaKey: "a2" }, imageFile(pngBytes("second")));

  // The public route selects propertyMedia by property_id ordered by "order".
  const publicRoute = await readFile(new URL("../app/api/properties/[id]/route.ts", import.meta.url), "utf8");
  assert.match(publicRoute, /from\(propertyMedia\)/);
  assert.match(publicRoute, /orderBy\(propertyMedia\.order\)/);

  const rendered = db
    .dump("property_media")
    .filter((row) => row.property_id === propertyId)
    .sort((a, b) => Number(a.order) - Number(b.order));

  assert.equal(rendered.length, 2);
  for (const row of rendered) {
    assert.ok(row.id, "id");
    assert.ok(row.url.startsWith("/api/office/v1/media?key="), "public url");
    assert.equal(row.type, "image");
    assert.ok(Number.isFinite(Number(row.order)));
  }
  assert.equal(rendered[0].is_featured, true);
  assert.equal(rendered[1].is_featured, false);
});

// ---- the route contract ----------------------------------------------------

test("the media route no longer dispatches on unreachable path segments", async () => {
  const source = await readFile(new URL("../app/api/office/v1/media/route.ts", import.meta.url), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*(\/\/|\*).*$/gm, "");

  assert.doesNotMatch(code, /segments\[2\]/);
  assert.doesNotMatch(code, /office_media_upload_sessions/);
  assert.doesNotMatch(code, /SET views = /);
  assert.doesNotMatch(code, /localhost/);
  assert.doesNotMatch(code, /api\/desktop/);
  assert.match(code, /authenticateOfficeRequest/);
  assert.match(code, /searchParams\.get\("action"\)/);
});

test("the media module never trusts a payload sponsor and never writes a second media model", async () => {
  const source = await readFile(new URL("../lib/integration/office-media.ts", import.meta.url), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*(\/\/|\*).*$/gm, "");

  assert.match(code, /getOfficePropertyLink/);
  assert.match(code, /INSERT INTO property_media/);
  assert.doesNotMatch(code, /body\.sponsorId/);
  assert.doesNotMatch(code, /getSession\(/);
  assert.doesNotMatch(code, /localhost/);
});
