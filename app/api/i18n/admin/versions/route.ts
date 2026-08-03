import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { listVersions, publishSnapshot, rollbackToVersion } from "@/lib/i18n/db";
import { invalidateLocaleCaches } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.I18N_VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const versions = await listVersions(100);
  return NextResponse.json({ versions });
}

type Body = {
  action: "publish" | "rollback";
  label?: string;
  version?: number;
};

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.I18N_PUBLISH)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.action === "publish") {
    const version = await publishSnapshot(body.label ?? `Publish by ${identity.displayName}`, {
      userId: identity.email ?? undefined,
    });
    invalidateLocaleCaches();
    return NextResponse.json({ ok: true, version });
  }

  if (body.action === "rollback") {
    if (typeof body.version !== "number" || body.version < 1) {
      return NextResponse.json({ error: "invalid_version" }, { status: 400 });
    }
    try {
      const count = await rollbackToVersion(body.version, { userId: identity.email ?? undefined });
      invalidateLocaleCaches();
      return NextResponse.json({ ok: true, restored: count });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "version_not_found") {
        return NextResponse.json({ error: "version_not_found" }, { status: 404 });
      }
      throw error;
    }
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
