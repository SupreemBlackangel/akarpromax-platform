import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { upsertTranslations, type UpsertTranslation } from "@/lib/i18n/db";
import { invalidateLocaleCaches } from "@/lib/i18n/core";
import { isLocale } from "@/lib/i18n/keys";
import type { Locale } from "@/src/types/site";

export const dynamic = "force-dynamic";

type Body = {
  entries?: Array<{ key: string; locale: string; value: string }>;
};

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.I18N_EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const entries: UpsertTranslation[] = (body.entries ?? [])
    .filter((entry) => entry?.key && isLocale(entry.locale) && typeof entry.value === "string")
    .map((entry) => ({ key: entry.key, locale: entry.locale as Locale, value: entry.value }));

  if (entries.length === 0) {
    return NextResponse.json({ error: "invalid_entries" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const result = await upsertTranslations(entries, { userId: identity.email ?? undefined, ip: ip ?? undefined });
  invalidateLocaleCaches();
  return NextResponse.json({ ok: true, ...result });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "POST, OPTIONS" } });
}
