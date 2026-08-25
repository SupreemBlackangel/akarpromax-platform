import test from "node:test";
import assert from "node:assert/strict";

import {
  createPropertySchema,
  updatePropertySchema,
  propertyStatusSchema,
  propertySearchSchema,
} from "../../lib/validators/property-validators";
import { normalizeApiProperty } from "../../lib/properties-api-normalize";
import { canAccessAdminArea } from "../../lib/auth/access-control";

test("property lifecycle statuses are exactly the reviewed set", () => {
  for (const status of ["draft", "pending_review", "approved", "rejected", "sold", "rented", "archived"]) {
    assert.equal(propertyStatusSchema.safeParse(status).success, true, status);
  }
  for (const invalid of ["published", "paused", "needs_changes", "PENDING_REVIEW", ""]) {
    assert.equal(propertyStatusSchema.safeParse(invalid).success, false, invalid);
  }
});

test("createPropertySchema accepts a canonical multi-country payload", () => {
  const parsed = createPropertySchema.safeParse({
    titleAr: "شقة فاخرة في مسقط",
    descriptionAr: "شقة واسعة بإطلالة بحرية في حي الخوير مع موقف خاص.",
    dealType: "rent",
    category: "residential",
    propertyType: "apartment",
    country: "om",
    governorate: "muscat",
    city: "muscat-city",
    district: "al-khuwair",
    latitude: 23.5859,
    longitude: 58.4059,
    price: 450,
    currency: "OMR",
    area: 120,
    media: [{ url: "https://cdn.example.com/a.jpg", type: "image" }],
    offers: [{ offerTypeId: "3b241101-e2bb-4255-8caf-4136c566a962", price: 450, marketingMethod: "direct" }],
  });
  assert.equal(parsed.success, true, JSON.stringify(parsed.success ? null : parsed.error.issues));
});

test("createPropertySchema rejects out-of-range coordinates and empty country", () => {
  const base = {
    titleAr: "عنوان تجريبي مقبول",
    descriptionAr: "وصف تجريبي طويل بما يكفي لتجاوز الحد الأدنى للتحقق.",
    dealType: "sale",
    category: "residential",
    propertyType: "villa",
    governorate: "riyadh",
    city: "riyadh-city",
    price: 100000,
    area: 500,
  };
  assert.equal(createPropertySchema.safeParse({ ...base, country: "", latitude: 10, longitude: 10 }).success, false);
  assert.equal(createPropertySchema.safeParse({ ...base, country: "sa", latitude: 91, longitude: 10 }).success, false);
  assert.equal(createPropertySchema.safeParse({ ...base, country: "sa", latitude: 10, longitude: 181 }).success, false);
});

test("auction offers require an auction type; direct offers refuse one", () => {
  const offer = { offerTypeId: "3b241101-e2bb-4255-8caf-4136c566a962", price: 1000 };
  const auctionMissing = updatePropertySchema.safeParse({ offers: [{ ...offer, marketingMethod: "auction" }] });
  assert.equal(auctionMissing.success, false);
  const directWithAuctionType = updatePropertySchema.safeParse({ offers: [{ ...offer, marketingMethod: "direct", auctionType: "open" }] });
  assert.equal(directWithAuctionType.success, false);
  const auctionOk = updatePropertySchema.safeParse({ offers: [{ ...offer, marketingMethod: "auction", auctionType: "open" }] });
  assert.equal(auctionOk.success, true);
});

test("public search schema keeps its filter surface and bounds", () => {
  const parsed = propertySearchSchema.parse({
    dealType: "sale",
    minPrice: 100000,
    maxPrice: 500000,
    bedrooms: 3,
    page: 2,
    limit: 20,
  });
  assert.equal(parsed.sortBy, "createdAt");
  assert.equal(parsed.sortOrder, "desc");
  assert.equal(propertySearchSchema.safeParse({ limit: 1000 }).success, false);
});

test("normalizeApiProperty passes dealType through as listingType verbatim", () => {
  const sale = normalizeApiProperty({ id: "p1", titleAr: "بيع", dealType: "sale" });
  const rent = normalizeApiProperty({ id: "p2", titleAr: "إيجار", dealType: "rent" });
  // The marketplace listing-type filter ids must match these exact values.
  assert.equal(sale.listingType, "sale");
  assert.equal(rent.listingType, "rent");
});

test("normalizeApiProperty exposes the full gallery, coordinates and cover", () => {
  const normalized = normalizeApiProperty({
    id: "p3",
    titleAr: "عقار",
    latitude: "24.71360000",
    longitude: "46.67530000",
    media: [
      { url: "https://cdn.example.com/cover.jpg", type: "image" },
      { url: "https://cdn.example.com/tour.mp4", type: "video" },
      { url: "https://cdn.example.com/side.jpg", type: "image" },
      { url: null, type: "image" },
    ],
  });
  assert.equal(normalized.imageUrl, "https://cdn.example.com/cover.jpg");
  assert.equal(normalized.mediaItems.length, 3);
  assert.deepEqual(normalized.mediaItems.map((m) => m.type), ["image", "video", "image"]);
  assert.equal(normalized.latitude, 24.7136);
  assert.equal(normalized.longitude, 46.6753);
});

test("normalizeApiProperty degrades safely with no media and bad coordinates", () => {
  const normalized = normalizeApiProperty({ id: "p4", titleAr: "بدون وسائط", latitude: "not-a-number" });
  assert.equal(normalized.imageUrl, null);
  assert.deepEqual(normalized.mediaItems, []);
  assert.equal(normalized.latitude, null);
  assert.equal(normalized.longitude, null);
});

test("admin property endpoints are closed to non-admin identities", () => {
  assert.equal(canAccessAdminArea({ authenticated: false, role: "super_admin", permissions: ["*"] }), false);
  assert.equal(canAccessAdminArea({ authenticated: true, role: "user", permissions: [] }), false);
  assert.equal(canAccessAdminArea({ authenticated: true, role: "viewer", permissions: ["services.view"] }), false);
  assert.equal(canAccessAdminArea({ authenticated: true, role: "super_admin", permissions: [] }), true);
  assert.equal(canAccessAdminArea({ authenticated: true, role: "moderator", permissions: ["*"] }), true);
});
