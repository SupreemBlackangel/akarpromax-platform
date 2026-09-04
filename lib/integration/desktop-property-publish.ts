import { and, eq, ne, sql, desc } from "drizzle-orm";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { properties, propertyMedia } from "@/lib/db/schemas/properties-schema";
import { propertyOffers, propertyOfferTypes } from "@/lib/db/schemas/offer-types-schema";
import { getDb } from "@/lib/db";
import { verifySessionPayload } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { storePropertyImage } from "@/lib/properties/image-processing";
import { matchesFileSignature } from "@/lib/security/file-signatures";

/**
 * Shared logic for the desktop property-publish bridge
 * (app/api/program/properties[/[id]]/route.ts). See those route files for
 * the CORS/HTTP wiring; this module is the field-mapping + DB write.
 */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Source",
  "Access-Control-Max-Age": "86400",
};

export async function authenticateDesktop(request: Request): Promise<{ userId: string } | null> {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const token = bearer || request.headers.get("x-api-key") || "";
  if (!token) return null;
  const payload = await verifySessionPayload(token, getRuntimeEnv().sessionSecret);
  if (!payload) return null;
  return { userId: payload.userId };
}

// Desktop's "category" field is actually the granular property type.
// Canonical `category` (residential/commercial/industrial/land/agricultural)
// is derived from it.
const PROPERTY_TYPE_TO_CATEGORY: Record<string, string> = {
  villa: "residential", apartment: "residential", townhouse: "residential",
  duplex: "residential", penthouse: "residential", building: "residential",
  shop: "commercial", office: "commercial", hotel: "commercial",
  resort: "commercial", restaurant: "commercial",
  warehouse: "industrial", factory: "industrial",
  land: "land", ranch: "land",
  farm: "agricultural",
};
const KNOWN_PROPERTY_TYPES = new Set(Object.keys(PROPERTY_TYPE_TO_CATEGORY));

// The desktop's `type` accepts the full offer-type taxonomy (property_offer_types
// codes, case-insensitive) as well as the legacy sale/rent values. The canonical
// dealType column stays sale|rent for compatibility with every existing filter;
// the real offer type is recorded as a property_offers row.
const OFFER_CODE_TO_DEAL_TYPE: Record<string, "sale" | "rent"> = {
  SALE: "sale",
  RENT: "rent",
  TAQBEEL: "sale",
  FARAGH: "sale",
  INVESTMENT: "sale",
  ASSIGNMENT: "sale",
  USUFRUCT: "rent",
  LEASE_TO_OWN: "rent",
  EXCHANGE: "sale",
  PARTNERSHIP: "sale",
  SHARE_SALE: "sale",
};

function resolveOfferCode(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (upper === "SALE" || upper === "SELL") return "SALE";
  if (upper === "RENT" || upper === "LEASE") return "RENT";
  return OFFER_CODE_TO_DEAL_TYPE[upper] ? upper : "SALE";
}

export type DesktopPropertyBody = {
  title?: unknown;
  titleAr?: unknown;
  description?: unknown;
  descriptionAr?: unknown;
  price?: unknown;
  currency?: unknown;
  type?: unknown; // offer type: sale/rent or any property_offer_types code (TAQBEEL, INVESTMENT, ...)
  offerType?: unknown; // explicit offer-type code; takes precedence over `type`
  category?: unknown; // actually property type: apartment/villa/...
  city?: unknown;
  area?: unknown;
  bedrooms?: unknown;
  bathrooms?: unknown;
  images?: unknown;
  videoUrl?: unknown;
  lat?: unknown;
  lng?: unknown;
  ownerName?: unknown;
  agentName?: unknown;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// The desktop app sends images picked via FileReader.readAsDataURL(), i.e.
// base64 data URLs, not remote URLs — decode and store them locally, served
// by nginx from PROPERTY_UPLOAD_DIR under /uploads/properties/.
const UPLOAD_DIR = process.env.PROPERTY_UPLOAD_DIR || "/var/www/uploads/properties";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGES = 20;
const DATA_URL_RE = /^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=]+)$/i;
const EXT_BY_MIME: Record<string, string> = { png: "png", jpeg: "jpg", jpg: "jpg", webp: "webp" };

/**
 * Whether the bytes match the declared mime.
 *
 * Delegates to lib/security/file-signatures.ts. The copy that was here checked
 * only the first FOUR bytes of the PNG signature; the remaining four exist to
 * catch a file mangled by a text-mode transfer, so dropping them threw away the
 * part that detects corruption.
 */
function signatureMatches(bytes: Uint8Array, mime: string): boolean {
  return matchesFileSignature(bytes, mime);
}

async function saveDataUrlImage(dataUrl: string): Promise<string | null> {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return null;
  if (!signatureMatches(buffer, mime)) return null;
  // Unified pipeline: WebP-optimized, resized, stored under PROPERTY_UPLOAD_DIR.
  return storePropertyImage(buffer, mime);
}

async function resolveImages(rawImages: unknown): Promise<string[]> {
  if (!Array.isArray(rawImages)) return [];
  const urls: string[] = [];
  for (const v of rawImages.slice(0, MAX_IMAGES)) {
    if (typeof v !== "string") continue;
    if (/^https?:\/\//i.test(v)) {
      urls.push(v);
    } else if (v.startsWith("data:image/")) {
      const saved = await saveDataUrlImage(v);
      if (saved) urls.push(saved);
    }
  }
  return urls;
}

async function loadOfficeLocation(userId: string): Promise<{ country: string; governorate: string; city: string }> {
  const { db, end } = getDb();
  try {
    const rows = await db.execute(sql`SELECT country, governorate, city FROM office_profiles WHERE user_id = ${userId} LIMIT 1`);
    const row = (rows as unknown as Array<Record<string, unknown>>)[0];
    return {
      country: text(row?.country, 100),
      governorate: text(row?.governorate, 100),
      city: text(row?.city, 100),
    };
  } catch {
    return { country: "", governorate: "", city: "" };
  } finally {
    await end();
  }
}

/**
 * The office's own published properties, for the desktop portal's
 * "test connection" and pull-listing features. Scoped to the signed-in office
 * (userId) so a desktop client only ever sees what it published.
 */
export async function listDesktopProperties(userId: string): Promise<{ total: number; properties: Array<Record<string, unknown>> }> {
  const { db, end } = getDb();
  try {
    const rows = await db
      .select({
        id: properties.id,
        title: properties.titleAr,
        description: properties.descriptionAr,
        status: properties.status,
        dealType: properties.dealType,
        category: properties.category,
        propertyType: properties.propertyType,
        city: properties.city,
        district: properties.district,
        governorate: properties.governorate,
        country: properties.country,
        address: properties.address,
        latitude: properties.latitude,
        longitude: properties.longitude,
        area: properties.area,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        price: properties.price,
        currency: properties.currency,
        ownerName: properties.ownerName,
        agentName: properties.agentName,
        createdAt: properties.createdAt,
      })
      .from(properties)
      .where(eq(properties.userId, userId))
      .orderBy(desc(properties.createdAt))
      .limit(500);
    return { total: rows.length, properties: rows };
  } finally {
    await end();
  }
}

export type PublishResult = { status: number; body: { ok: boolean; message: string; id?: string } };

/** Archive (soft-delete) one of the office's own published properties. */
export async function deleteDesktopProperty(userId: string, propertyId: string): Promise<PublishResult> {
  const { db, end } = getDb();
  try {
    const [archived] = await db
      .update(properties)
      .set({ status: "archived" })
      .where(and(eq(properties.id, propertyId), eq(properties.userId, userId)))
      .returning({ id: properties.id });
    if (!archived) return { status: 404, body: { ok: false, message: "العقار غير موجود" } };
    return { status: 200, body: { ok: true, id: archived.id, message: "تم حذف العقار من المنصة" } };
  } finally {
    await end();
  }
}

export async function publishDesktopProperty(userId: string, body: DesktopPropertyBody, existingId: string | null): Promise<PublishResult> {
  const titleAr = text(body.titleAr, 200) || text(body.title, 200);
  const descriptionAr = text(body.descriptionAr, 5000) || text(body.description, 5000);
  const price = num(body.price, 0);
  const area = num(body.area, 0);
  if (!titleAr || !descriptionAr || price <= 0 || area <= 0) {
    return { status: 400, body: { ok: false, message: "العنوان والوصف والسعر والمساحة مطلوبة" } };
  }

  const offerCode = resolveOfferCode(text(body.offerType, 30) || text(body.type, 30));
  const dealType = OFFER_CODE_TO_DEAL_TYPE[offerCode];
  const rawPropertyType = text(body.category, 30).toLowerCase();
  const propertyType = KNOWN_PROPERTY_TYPES.has(rawPropertyType) ? rawPropertyType : "apartment";
  const category = PROPERTY_TYPE_TO_CATEGORY[propertyType] ?? "residential";

  // The canonical city column is matched against the geo registry's codes by
  // every listing filter, so it must come from the office profile (whose
  // country/governorate/city were picked from /api/geo). The desktop's own
  // `city` is free-typed Arabic text — keeping it here would file the listing
  // under a code that matches no scope, making it invisible on the platform.
  const office = await loadOfficeLocation(userId);
  const city = office.city;
  if (!office.country || !office.governorate || !city) {
    return { status: 422, body: { ok: false, message: "أكمل بروفايل المكتب (الدولة والمنطقة والمدينة) قبل النشر" } };
  }
  const address = text(body.city, 100);

  const ownerName = text(body.ownerName, 200) || null;
  const agentName = text(body.agentName, 200) || null;
  const images = await resolveImages(body.images);
  const videoUrl = text(body.videoUrl, 500);
  const latitude = Number.isFinite(Number(body.lat)) && Number(body.lat) !== 0 ? String(Number(body.lat)) : null;
  const longitude = Number.isFinite(Number(body.lng)) && Number(body.lng) !== 0 ? String(Number(body.lng)) : null;

  const { db, end } = getDb();

  // Record the true offer type as a property_offers row so the public
  // marketplace filter and card badges reflect it. Non-fatal: a publish must
  // not fail because the offers tables are missing or unseeded.
  const syncPropertyOffer = async (propertyId: string) => {
    try {
      const [typeRow] = await db
        .select({ id: propertyOfferTypes.id })
        .from(propertyOfferTypes)
        .where(eq(propertyOfferTypes.code, offerCode))
        .limit(1);
      if (!typeRow) return;
      await db.delete(propertyOffers).where(eq(propertyOffers.propertyId, propertyId));
      await db.insert(propertyOffers).values({
        propertyId,
        offerTypeId: typeRow.id,
        marketingMethod: "direct",
        status: "active",
        price: String(price),
        currency: text(body.currency, 8) || "SAR",
      });
    } catch (offerError) {
      console.error("[desktop publish] offer sync failed:", offerError);
    }
  };

  try {
    // Sync-as-update: a publish without an explicit id still updates the
    // office's existing listing of the same title (any non-archived status)
    // instead of creating a duplicate — re-syncing from the desktop app is
    // an update, never a second copy.
    if (!existingId) {
      const [duplicate] = await db
        .select({ id: properties.id })
        .from(properties)
        .where(and(
          eq(properties.userId, userId),
          eq(properties.titleAr, titleAr),
          ne(properties.status, "archived"),
        ))
        .orderBy(desc(properties.createdAt))
        .limit(1);
      if (duplicate) existingId = duplicate.id;
    }

    if (existingId) {
      const [updated] = await db
        .update(properties)
        .set({
          titleAr, descriptionAr, dealType, category, propertyType,
          country: office.country, governorate: office.governorate, city, address,
          price: String(price), currency: text(body.currency, 8) || "SAR",
          area: String(area), bedrooms: Math.max(0, num(body.bedrooms, 0)), bathrooms: Math.max(0, num(body.bathrooms, 0)),
          latitude, longitude, ownerName, agentName,
        })
        .where(and(eq(properties.id, existingId), eq(properties.userId, userId)))
        .returning();
      if (!updated) return { status: 404, body: { ok: false, message: "العقار غير موجود" } };
      await syncPropertyOffer(updated.id);

      if (images.length > 0 || videoUrl) {
        await db.delete(propertyMedia).where(eq(propertyMedia.propertyId, updated.id));
        if (images.length > 0) {
          await db.insert(propertyMedia).values(
            images.map((url, index) => ({
              propertyId: updated.id,
              url,
              type: "image" as const,
              order: index,
              isFeatured: index === 0,
              altText: "",
            })),
          );
        }
        if (videoUrl) {
          await db.insert(propertyMedia).values([{ propertyId: updated.id, url: videoUrl, type: "video" as const, order: images.length, isFeatured: false, altText: "" }]);
        }
      }
      return { status: 200, body: { ok: true, id: updated.id, message: "تم التحديث بنجاح" } };
    }

    const [created] = await db
      .insert(properties)
      .values({
        userId,
        titleAr, titleEn: "", descriptionAr, descriptionEn: "",
        dealType, category, propertyType,
        country: office.country, governorate: office.governorate, city, district: "",
        latitude, longitude, address,
        price: String(price), currency: text(body.currency, 8) || "SAR",
        area: String(area), bedrooms: Math.max(0, num(body.bedrooms, 0)), bathrooms: Math.max(0, num(body.bathrooms, 0)),
        ownerName, agentName,
        status: "pending_review",
      })
      .returning();
    if (!created) return { status: 500, body: { ok: false, message: "تعذّر إنشاء العقار" } };
    await syncPropertyOffer(created.id);

    if (images.length > 0) {
      await db.insert(propertyMedia).values(
        images.map((url, index) => ({
          propertyId: created.id,
          url,
          type: "image" as const,
          order: index,
          isFeatured: index === 0,
          altText: "",
        })),
      );
    }
    if (videoUrl) {
      await db.insert(propertyMedia).values([{ propertyId: created.id, url: videoUrl, type: "video" as const, order: images.length, isFeatured: false, altText: "" }]);
    }

    return { status: 200, body: { ok: true, id: created.id, message: "تم النشر بنجاح" } };
  } finally {
    await end();
  }
}
