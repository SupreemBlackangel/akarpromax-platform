import { NextRequest, NextResponse } from "next/server";

import { getFlatBundle, resolveLocale } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await context.params;
  const locale = resolveLocale(raw);
  const flat = await getFlatBundle(locale);
  return NextResponse.json({ locale, translations: flat });
}
