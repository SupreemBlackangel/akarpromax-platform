import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { verifySessionPayload } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";

export const dynamic = "force-dynamic";

/**
 * Desktop office-profile bridge: name, logo, contact and location for the
 * office running the desktop app. Authenticated with the same bearer token
 * /api/program/login issues. The saved country/governorate/city double as
 * the default location for property publishes from the same office
 * (POST /api/program/properties), since the desktop app never collects
 * those fields itself.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

// Logos are stored inline as a data: URL; cap comfortably above a small
// square PNG/JPEG so it never has to touch object storage for this.
const MAX_LOGO_BYTES = 400_000;

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

async function authenticate(request: Request): Promise<{ userId: string } | null> {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const token = bearer || request.headers.get("x-api-key") || "";
  if (!token) return null;
  const payload = await verifySessionPayload(token, getRuntimeEnv().sessionSecret);
  if (!payload) return null;
  return { userId: payload.userId };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const identity = await authenticate(request);
  if (!identity) return json({ success: false, message: "غير مصرح" }, 401);

  const { db, end } = getDb();
  try {
    const rows = await db.execute(sql`
      SELECT name, logo_data, phone, whatsapp, email, website, country, governorate, city, address
      FROM office_profiles WHERE user_id = ${identity.userId} LIMIT 1
    `);
    const row = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!row) return json({ success: true, profile: null }, 200);
    return json(
      {
        success: true,
        profile: {
          name: row.name ?? "",
          logoData: row.logo_data ?? "",
          phone: row.phone ?? "",
          whatsapp: row.whatsapp ?? "",
          email: row.email ?? "",
          website: row.website ?? "",
          country: row.country ?? "",
          governorate: row.governorate ?? "",
          city: row.city ?? "",
          address: row.address ?? "",
        },
      },
      200,
    );
  } finally {
    await end();
  }
}

type ProfileBody = {
  name?: unknown;
  logoData?: unknown;
  phone?: unknown;
  whatsapp?: unknown;
  email?: unknown;
  website?: unknown;
  country?: unknown;
  governorate?: unknown;
  city?: unknown;
  address?: unknown;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const identity = await authenticate(request);
  if (!identity) return json({ success: false, message: "غير مصرح" }, 401);

  let body: ProfileBody;
  try {
    body = (await request.json()) as ProfileBody;
  } catch {
    return json({ success: false, message: "طلب غير صالح" }, 400);
  }

  const name = text(body.name, 200);
  if (!name) return json({ success: false, message: "اسم المكتب مطلوب" }, 400);

  const logoData = text(body.logoData, MAX_LOGO_BYTES + 200);
  if (logoData && logoData.length > MAX_LOGO_BYTES) {
    return json({ success: false, message: "الشعار كبير جدًا (الحد 400 كيلوبايت)" }, 400);
  }
  if (logoData && !/^data:image\/(png|jpe?g|webp|svg\+xml);base64,/i.test(logoData)) {
    return json({ success: false, message: "صيغة الشعار غير صالحة" }, 400);
  }

  const phone = text(body.phone, 40);
  const whatsapp = text(body.whatsapp, 40);
  const email = text(body.email, 200);
  const website = text(body.website, 300);
  const country = text(body.country, 100);
  const governorate = text(body.governorate, 100);
  const city = text(body.city, 100);
  const address = text(body.address, 500);

  const { db, end } = getDb();
  try {
    await db.execute(sql`
      INSERT INTO office_profiles (user_id, name, logo_data, phone, whatsapp, email, website, country, governorate, city, address, updated_at)
      VALUES (${identity.userId}, ${name}, ${logoData}, ${phone}, ${whatsapp}, ${email}, ${website}, ${country}, ${governorate}, ${city}, ${address}, now())
      ON CONFLICT (user_id) DO UPDATE SET
        name = EXCLUDED.name, logo_data = EXCLUDED.logo_data, phone = EXCLUDED.phone,
        whatsapp = EXCLUDED.whatsapp, email = EXCLUDED.email, website = EXCLUDED.website,
        country = EXCLUDED.country, governorate = EXCLUDED.governorate, city = EXCLUDED.city,
        address = EXCLUDED.address, updated_at = now()
    `);
    return json({ success: true }, 200);
  } finally {
    await end();
  }
}
