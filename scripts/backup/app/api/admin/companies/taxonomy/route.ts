import { NextResponse } from "next/server";
import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { ensureCompanySchema } from "@/lib/company-schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !hasSponsorPermission(identity, PERMISSIONS.PROPERTIES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = await getRuntimeDb();
  await ensureCompanySchema(db);
  const rows = await db
    .prepare(
      "SELECT id, label_ar, label_en, label_tr, icon, is_active, sort_order FROM company_specialties ORDER BY sort_order ASC, label_en ASC",
    )
    .all<{ id: string; label_ar: string; label_en: string; label_tr: string; icon: string | null; is_active: number; sort_order: number }>();
  const specialties = rows.results.map((row) => ({
    id: row.id,
    name_en: row.label_en,
    name_ar: row.label_ar,
    name_tr: row.label_tr,
    slug: row.id,
    icon: row.icon,
    is_active: row.is_active === 1,
    sort_order: row.sort_order,
  }));
  return NextResponse.json({ specialties }, { headers: { "Cache-Control": "no-store" } });
}
