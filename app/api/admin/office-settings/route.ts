import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getOfficeSettings } from "@/lib/integration/office-settings";
import { getIntegrationDb } from "@/lib/integration/db";

export const dynamic = "force-dynamic";

/**
 * What an office has configured in its desktop app, for support.
 *
 * Read-only, deliberately. When an office says "my documents are saving to the
 * wrong folder" or "the website shows our old phone number", the answer is in
 * these sections — but an administrator editing them from here would be
 * changing a firm's own settings behind its back, and the desktop would
 * overwrite the edit on its next save anyway.
 *
 * Same gate as the rest of the office admin surface.
 */
const READ = PERMISSIONS.OFFICE_ADMIN_VIEW;

export async function GET(req: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, READ)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sponsorId = (req.nextUrl.searchParams.get("sponsorId") ?? "").trim().toLowerCase();
  const db = await getIntegrationDb();

  if (!sponsorId) {
    // Which offices have ever saved anything, so support can pick one rather
    // than having to already know the address.
    const rows = await db
      .prepare("SELECT sponsor_id, version, updated_at FROM office_settings ORDER BY updated_at DESC LIMIT 200")
      .all<{ sponsor_id: string; version: number; updated_at: string }>();
    return NextResponse.json({
      offices: (rows?.results ?? []).map((row) => ({
        sponsorId: row.sponsor_id,
        version: Number(row.version ?? 0),
        updatedAt: row.updated_at ?? null,
      })),
    });
  }

  const settings = await getOfficeSettings(sponsorId);

  // Which machine saved it, by name — a device id means nothing to somebody
  // reading a support ticket.
  let updatedByDeviceName: string | null = null;
  if (settings.updatedByDeviceId) {
    const device = await db
      .prepare("SELECT device_name FROM office_devices WHERE id = ?1 LIMIT 1")
      .bind(settings.updatedByDeviceId)
      .first<{ device_name: string }>();
    updatedByDeviceName = device?.device_name ?? null;
  }

  return NextResponse.json({ ...settings, updatedByDeviceName });
}
