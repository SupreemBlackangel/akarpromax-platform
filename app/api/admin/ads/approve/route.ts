import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { canManageTargets } from "@/lib/ads/admin";
import { emailService } from "@/lib/email";

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
  const existing = await db.prepare("SELECT id, countries, campaign_type, status, created_by, internal_name, advertiser_name FROM ad_campaigns WHERE id = ?1 AND deleted_at IS NULL LIMIT 1")
    .bind(id).first<{ id: string; countries: string | null; campaign_type: string; status: string; created_by: string | null; internal_name: string | null; advertiser_name: string | null }>();
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
    .bind(approvalStatus, identity.email, approvalStatus === "approved" ? 1 : 0, shouldActivate ? 1 : 0, id)
    .run();
  try {
    await db.prepare(
      `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
       VALUES (?1, ?2, ?3, 'ad_campaign', ?4, ?5)`,
    ).bind(crypto.randomUUID(), identity.email, "ad.approval", id, JSON.stringify({ approvalStatus, autoActivated: shouldActivate })).run();
  } catch {
    // audit best-effort
  }

  // Close the advertiser loop: requests carry the advertiser's contact email
  // in created_by — tell them the outcome. Fire-and-forget; approval never
  // fails because the mailbox does.
  const advertiserEmail = existing.created_by ?? "";
  if (isRequest && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(advertiserEmail)) {
    const campaignName = existing.internal_name || existing.advertiser_name || "حملتك الإعلانية";
    const approved = approvalStatus === "approved";
    const subject = approved
      ? "تم اعتماد إعلانك على عقار بروماكس 🎉"
      : "تحديث بشأن طلب إعلانك على عقار بروماكس";
    const bodyText = approved
      ? `تهانينا! تم اعتماد حملتك «${campaignName}» وأصبح إعلانك معروضًا الآن في الموضع الذي طلبته على akarpromax.com.`
      : `نأسف — لم يُعتمد طلب الإعلان «${campaignName}» في صورته الحالية. يمكنك تقديم طلب جديد بعد تعديل التصميم أو المحتوى، أو التواصل معنا للتفاصيل.`;
    const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f4f7fd;padding:24px"><div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px;border:1px solid #e2e9f5"><h2 style="margin:0 0 12px;color:#0b214c">${approved ? "تم اعتماد إعلانك ✓" : "تحديث بشأن طلب إعلانك"}</h2><p style="margin:0 0 18px;color:#33507d;line-height:1.9">${bodyText}</p><a href="https://akarpromax.com" style="display:inline-block;background:#1769ff;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700">زيارة المنصة</a><p style="margin:20px 0 0;font-size:12px;color:#8b98ad">عقار بروماكس — akarpromax.com</p></div></div>`;
    void emailService.getTransport().send({ to: advertiserEmail, subject, html, text: bodyText }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, approvalStatus, autoActivated: shouldActivate });
}
