import { eq, sql } from "drizzle-orm";
import { properties, propertyMedia } from "@/lib/db/schemas/properties-schema";
import { getDb } from "@/lib/db";
import { verifySessionPayload } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";

/**
 * Shared logic for the desktop property-publish bridge
 * (app/api/program/properties[/[id]]/route.ts). See those route files for
 * the CORS/HTTP wiring; this module is the field-mapping + DB write.
 */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
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
const KNOWN_DEAL_TYPES = new Set(["sale", "rent"]);

export type DesktopPropertyBody = {
  title?: unknown;
  titleAr?: unknown;
  description?: unknown;
  descriptionAr?: unknown;
  price?: unknown;
  currency?: unknown;
  type?: unknown; // deal type: sale/rent
  category?: unknown; // actually property type: apartment/villa/...
  city?: unknown;
  area?: unknown;
  bedrooms?: unknown;
  bathrooms?: unknown;
  images?: unknown;
  videoUrl?: unknown;
  lat?: unknown;
  lng?: unknown;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

export type PublishResult = { status: number; body: { ok: boolean; message: string; id?: string } };

export async function publishDesktopProperty(userId: string, body: DesktopPropertyBody, existingId: string | null): Promise<PublishResult> {
  const titleAr = text(body.titleAr, 200) || text(body.title, 200);
  const descriptionAr = text(body.descriptionAr, 5000) || text(body.description, 5000);
  const price = num(body.price, 0);
  const area = num(body.area, 0);
  if (!titleAr || !descriptionAr || price <= 0 || area <= 0) {
    return { status: 400, body: { ok: false, message: "العنوان والوصف والسعر والمساحة مطلوبة" } };
  }

  const rawDealType = text(body.type, 20).toLowerCase();
  const dealType = KNOWN_DEAL_TYPES.has(rawDealType) ? rawDealType : "sale";
  const rawPropertyType = text(body.category, 30).toLowerCase();
  const propertyType = KNOWN_PROPERTY_TYPES.has(rawPropertyType) ? rawPropertyType : "apartment";
  const category = PROPERTY_TYPE_TO_CATEGORY[propertyType] ?? "residential";

  const office = await loadOfficeLocation(userId);
  const city = text(body.city, 100) || office.city;
  if (!office.country || !office.governorate || !city) {
    return { status: 422, body: { ok: false, message: "أكمل بروفايل المكتب (الدولة والمنطقة والمدينة) قبل النشر" } };
  }

  const images = Array.isArray(body.images)
    ? body.images.filter((v): v is string => typeof v === "string" && /^https?:\/\//i.test(v))
    : [];
  const videoUrl = text(body.videoUrl, 500);
  const latitude = Number.isFinite(Number(body.lat)) && Number(body.lat) !== 0 ? String(Number(body.lat)) : null;
  const longitude = Number.isFinite(Number(body.lng)) && Number(body.lng) !== 0 ? String(Number(body.lng)) : null;

  const { db, end } = getDb();
  try {
    if (existingId) {
      const [updated] = await db
        .update(properties)
        .set({
          titleAr, descriptionAr, dealType, category, propertyType,
          country: office.country, governorate: office.governorate, city,
          price: String(price), currency: text(body.currency, 8) || "SAR",
          area: String(area), bedrooms: Math.max(0, num(body.bedrooms, 0)), bathrooms: Math.max(0, num(body.bathrooms, 0)),
          latitude, longitude,
        })
        .where(eq(properties.id, existingId))
        .returning();
      if (!updated) return { status: 404, body: { ok: false, message: "العقار غير موجود" } };
      return { status: 200, body: { ok: true, id: updated.id, message: "تم التحديث بنجاح" } };
    }

    const [created] = await db
      .insert(properties)
      .values({
        userId,
        titleAr, titleEn: "", descriptionAr, descriptionEn: "",
        dealType, category, propertyType,
        country: office.country, governorate: office.governorate, city, district: "",
        latitude, longitude, address: "",
        price: String(price), currency: text(body.currency, 8) || "SAR",
        area: String(area), bedrooms: Math.max(0, num(body.bedrooms, 0)), bathrooms: Math.max(0, num(body.bathrooms, 0)),
        status: "pending_review",
      })
      .returning();
    if (!created) return { status: 500, body: { ok: false, message: "تعذّر إنشاء العقار" } };

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
