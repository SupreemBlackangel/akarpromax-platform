// Phase B1 — the desktop's offer-type list comes down the channel it already uses.
//
// `/api/program/taxonomies` is the public, CORS-enabled endpoint the office
// app's WebView already fetches for categories and subtypes. It now carries the
// offer types and the office listing statuses too, so the desktop can stop
// shipping four hard-coded chips.
//
// The point of these tests is the SOURCE, not the shape: the list must come
// from `lib/integration/reference.ts`, which is the same query `/api/offer-types`
// and `/api/office/v1/reference` run. A second list would drift, and drift here
// means a desktop publishing an offer type the website rejects.
import assert from "node:assert/strict";
import test from "node:test";

import { setOfferTypeReaderForTesting, OFFICE_LISTING_STATUSES } from "../lib/integration/reference.ts";
import { propertyOfferTypesSeed } from "../lib/db/schemas/offer-types-schema.ts";
import { GET } from "../app/api/program/taxonomies/route.ts";

const rows = () =>
  propertyOfferTypesSeed.map((seed, index) => ({
    code: seed.code,
    nameAr: seed.nameAr,
    nameEn: seed.nameEn,
    nameTr: null,
    displayOrder: index + 1,
    isActive: true,
    allowDirect: seed.allowDirect,
    allowAuction: seed.allowAuction,
  }));

const body = async () => (await GET()).json();

test.afterEach(() => setOfferTypeReaderForTesting(null));

test("the eleven offer types travel with the taxonomy", async () => {
  setOfferTypeReaderForTesting(async () => rows());
  const payload = await body();
  assert.equal(payload.offerTypes.length, propertyOfferTypesSeed.length);
  const codes = payload.offerTypes.map((offer) => offer.code);
  assert.ok(codes.includes("taqbeel"), "تقبيل is offered");
  assert.ok(codes.includes("faragh"), "فروغ is offered");
  assert.ok(codes.includes("lease_to_own"));
});

test("codes arrive lowercase, which is what the property row stores", async () => {
  // The table holds SALE; `dealType` is `sale`. Sending the upper-cased code
  // would have every desktop lower-case it on the way in and out, which is a
  // rule nobody writes down and somebody eventually gets wrong.
  setOfferTypeReaderForTesting(async () => rows());
  for (const offer of (await body()).offerTypes) {
    assert.equal(offer.code, offer.code.toLowerCase());
  }
});

test("each offer type carries its three names, so no desktop invents a translation", async () => {
  setOfferTypeReaderForTesting(async () => rows());
  const sale = (await body()).offerTypes.find((offer) => offer.code === "sale");
  assert.equal(sale.nameAr, "بيع");
  assert.equal(sale.nameEn, "Sale");
  assert.equal(sale.nameTr, null);
});

test("an offer type switched off in the admin panel is not offered", async () => {
  // The reader filters on isActive; the endpoint sends what it is given
  // rather than filtering a second time to its own idea of active.
  setOfferTypeReaderForTesting(async () => rows().filter((row) => row.code !== "EXCHANGE"));
  const codes = (await body()).offerTypes.map((offer) => offer.code);
  assert.ok(!codes.includes("exchange"));
  assert.ok(codes.includes("sale"));
});

test("the office's own three filing states come too", async () => {
  setOfferTypeReaderForTesting(async () => rows());
  const statuses = (await body()).listingStatuses;
  assert.deepEqual(
    statuses.map((status) => status.id),
    OFFICE_LISTING_STATUSES.map((status) => status.id),
  );
  // Only the active market has a website counterpart: an office filing a
  // listing "under management" must not thereby approve it.
  assert.equal(statuses.find((status) => status.id === "active_market").platformStatus, "approved");
  assert.equal(statuses.find((status) => status.id === "under_management").platformStatus, null);
});

test("a failed offer-type read does not take the categories down with it", async () => {
  // The source-held lists cannot fail; this one is a database read. A desktop
  // that asked for the taxonomy and got a 500 would fall back to a cache that
  // may be months old, over a list it did not need refreshed.
  setOfferTypeReaderForTesting(async () => {
    throw new Error("database unavailable");
  });
  const response = await GET();
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.offerTypes, []);
  assert.ok(payload.categories.length > 0, "categories still arrive");
  assert.ok(payload.types.length > 0, "subtypes still arrive");
});

test("the desktop can still read it from its own origin", async () => {
  // The WebView is https://akarapp.local — a cross-origin caller. Losing this
  // header breaks every office at once and would be found only in the field.
  setOfferTypeReaderForTesting(async () => rows());
  const response = await GET();
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
});
