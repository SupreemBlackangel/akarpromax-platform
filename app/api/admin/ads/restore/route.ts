import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { canManageTargets } from "@/lib/ads/admin";

export const dynamic = "force-dynamic";

function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** Bring an archived campaign back as an inactive draft. */
export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_DELETE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Missing campaign id" }, { status: 400 });

  const db = await getRuntimeDb();
  const existing = await db.prepare("SELECT id, countries FROM ad_campaigns WHERE id = ?1 AND deleted_at IS NOT NULL LIMIT 1")
    .bind(id).first<{ id: string; countries: string | null }>();
  if (!existing || !canManageTargets(identity, parseList(existing.countries))) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  await db
    .prepare("UPDATE ad_campaigns SET deleted_at = NULL, status = 'draft', is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1")
    .bind(id)
    .run();

  try {
    await db.prepare(
      `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
       VALUES (?1, ?2, 'ad.restored', 'ad_campaign', ?3, '{}')`,
    ).bind(crypto.randomUUID(), identity.email, id).run();
  } catch { /* audit best-effort */ }

  return NextResponse.json({ ok: true });
}
