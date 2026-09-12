import { NextRequest, NextResponse } from "next/server";

import { authenticateOfficeRequest, requireScope } from "@/lib/integration/office-auth";
import {
  OfficeSettingsError,
  brandingProfilePatch,
  getOfficeSettings,
  saveOfficeSettings,
  type OfficeSettings,
} from "@/lib/integration/office-settings";
import { getSponsorSubscriptionSnapshot } from "@/lib/integration/subscription";
import { applyOfficeBrandingToProfile } from "@/lib/integration/office-organization";
import { createRealtimeTransport } from "@/lib/integration/realtime";

export const dynamic = "force-dynamic";

/**
 * Settings an office shares across its machines.
 *
 * Scoped to `office.sync` — already held by every paired device, and the same
 * scope that governs pushing property changes, which is the right company for
 * "this device writes on the office's behalf".
 */
const SCOPE = "office.sync" as const;

/**
 * `license` is the platform's answer, not the office's claim.
 *
 * It is filled from the subscription snapshot on the way out and refused on the
 * way in, so a desktop cannot grant itself one.
 */
async function withLicense(settings: OfficeSettings): Promise<OfficeSettings> {
  const snapshot = await getSponsorSubscriptionSnapshot(settings.sponsorId);
  return {
    ...settings,
    sections: { ...settings.sections, license: snapshot as unknown as Record<string, unknown> },
  };
}

function etagFor(settings: OfficeSettings): string {
  return `"v${settings.version}"`;
}

export async function GET(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, SCOPE);
  if (blocked) return blocked;

  const settings = await withLicense(await getOfficeSettings(auth.device.sponsorId));
  const etag = etagFor(settings);

  const requested = (req.headers.get("if-none-match") ?? "").replace(/^W\//, "").replace(/"/g, "").trim();
  if (requested && requested === `v${settings.version}`) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  return NextResponse.json(settings, { headers: { ETag: etag } });
}

export async function PUT(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, SCOPE);
  if (blocked) return blocked;

  const body = (await req.json().catch(() => null)) as
    | { version?: unknown; sections?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  let saved: OfficeSettings;
  try {
    saved = await saveOfficeSettings({
      sponsorId: auth.device.sponsorId,
      deviceId: auth.device.deviceId,
      version: body.version,
      sections: body.sections,
    });
  } catch (error) {
    if (error instanceof OfficeSettingsError) {
      if (error.code === "VERSION_CONFLICT") {
        // 409 with the current state, so the desktop can show the two versions
        // side by side rather than asking the user to guess what changed.
        return NextResponse.json(
          { error: error.code, message: error.message, current: await withLicense(error.current!) },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    throw error;
  }

  // Branding is the one section with a life outside the office: the name,
  // description and contact details on the public office page. Applied after
  // the save, and a failure there does not undo the save — the settings are
  // the office's own record and the profile is a projection of part of them.
  const patch = brandingProfilePatch(saved.sections.branding);
  let profileUpdated = false;
  if (Object.keys(patch).length > 0) {
    profileUpdated = await applyOfficeBrandingToProfile(auth.device.sponsorId, patch);
  }

  // Tell the office's other machines, so a second desk picks the change up
  // instead of overwriting it on its next save.
  try {
    const transport = await createRealtimeTransport();
    if (transport.supported) {
      await transport.publish({
        eventId: crypto.randomUUID(),
        eventType: "office.settings.updated",
        scope: "sponsor",
        sponsorId: auth.device.sponsorId,
        officeId: auth.device.officeId ?? undefined,
        payload: { version: saved.version, updatedByDeviceId: auth.device.deviceId },
      });
    }
  } catch {
    // A settings save that worked must not report failure because the
    // notification did not; the other machines still reconcile on their next
    // poll.
  }

  return NextResponse.json(
    { ...(await withLicense(saved)), profileUpdated },
    { headers: { ETag: etagFor(saved) } },
  );
}
