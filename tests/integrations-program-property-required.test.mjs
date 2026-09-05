// The desktop publish bridge (POST/PUT /api/program/properties) refuses a
// listing that is missing what the office itself needs to act on it. The
// owner and the map position joined the required set after the platform was
// found holding listings with no owner at all — the desktop had sent "" and
// the bridge had filed it.
import assert from "node:assert/strict";
import test from "node:test";

import { missingDesktopPropertyFields, missingFieldsMessage } from "../lib/integration/desktop-property-publish.ts";

const complete = () => ({
  titleAr: "شقة في حي الروضة",
  descriptionAr: "شقة ثلاث غرف بإطلالة.",
  price: 450000,
  area: 96,
  ownerName: "ناصر الحربي",
  lat: 24.7136,
  lng: 46.6753,
});

test("a complete listing has nothing missing", () => {
  assert.deepEqual(missingDesktopPropertyFields(complete()), []);
});

test("the owner's name is required — blank and whitespace count as absent", () => {
  assert.deepEqual(missingDesktopPropertyFields({ ...complete(), ownerName: "" }), ["owner"]);
  assert.deepEqual(missingDesktopPropertyFields({ ...complete(), ownerName: "   " }), ["owner"]);
  assert.deepEqual(missingDesktopPropertyFields({ ...complete(), ownerName: undefined }), ["owner"]);
  assert.deepEqual(missingDesktopPropertyFields({ ...complete(), ownerName: 42 }), ["owner"]);
});

test("a map position is required — absent, unparseable, out of range or the 0/0 placeholder", () => {
  for (const [lat, lng] of [[undefined, undefined], ["x", "y"], [0, 0], [91, 46], [24, 181], [null, 46.6]]) {
    assert.deepEqual(missingDesktopPropertyFields({ ...complete(), lat, lng }), ["location"], `${lat},${lng}`);
  }
  // Strings that parse are fine — the desktop's number inputs may serialise as text.
  assert.deepEqual(missingDesktopPropertyFields({ ...complete(), lat: "24.7136", lng: "46.6753" }), []);
});

test("the earlier requirements still hold, and every gap is reported at once", () => {
  assert.deepEqual(missingDesktopPropertyFields({}), ["title", "description", "price", "area", "owner", "location"]);
  assert.deepEqual(missingDesktopPropertyFields({ ...complete(), price: 0, area: -3 }), ["price", "area"]);
  // Legacy field names are accepted as aliases.
  assert.deepEqual(missingDesktopPropertyFields({ ...complete(), titleAr: undefined, title: "عنوان", descriptionAr: undefined, description: "وصف" }), []);
});

test("the refusal message names each missing item in Arabic", () => {
  const message = missingFieldsMessage(["owner", "location"]);
  assert.match(message, /اسم المالك/);
  assert.match(message, /الموقع الجغرافي/);
  assert.match(message, /^لا يُقبل العقار بدون/);
});
