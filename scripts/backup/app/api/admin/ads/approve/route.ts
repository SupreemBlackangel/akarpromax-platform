import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { canManageTargets } from "@/lib/ads/admin";

export const dynamic = "force-dynamic";

function parseList(value: string | null | undefined, fallback: string[] = []): string[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : fallback;
  } catch {
    return fallback;
  }
}

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_APPROVE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { id?: string; approved?: boolean } | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Missing campaign id" }, { status: 400 });
  const approvalStatus = body.approved === false ? "rejected" : "approved";

  const db = await getRuntimeDb();
  const existing = await db.prepare("SELECT id, countries, campaign_type, status FROM ad_campaigns WHERE id = ?1 AND deleted_at IS NULL LIMIT 1")
    .bind(id).first<{ id: string; countries: string | null; campaign_type: string; status: string }>();
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (!canManageTargets(identity, parseList(existing.countries))) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const isRequest = existing.campaign_type === "request";
  const shouldActivate = approvalStatus === "approved" && isRequest && ["draft", "pending", "paused"].includes(existing.status);

  await db
    .prepare(
      `UPDATE ad_campaigns
       SET approval_status = ?, approved_by = ?, is_active = ?,
           status = CASE WHEN ? THEN 'active' ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(approvalStatus, identity.email, shouldActivate ? 1 : 1, shouldActivate ? 1 : 0, id)
    .run();
  try {
    await db.prepare(
      `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
       VALUES (?1, ?2, ?3, 'ad_campaign', ?4, ?5)`,
    ).bind(crypto.randomUUID(), identity.email, "ad.approval", id, JSON.stringify({ approvalStatus, autoActivated: shouldActivate })).run();
  } catch {
    // audit best-effort
  }
  return NextResponse.json({ ok: true, approvalStatus, autoActivated: shouldActivate });
}
