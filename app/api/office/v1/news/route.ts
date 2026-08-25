import { NextRequest, NextResponse } from "next/server";
import { authenticateOfficeRequest, requireScope } from "@/lib/integration/office-auth";
import { listOfficeNews, recordNewsDelivery } from "@/lib/integration/news";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.news.read");
  if (blocked) return blocked;

  const url = new URL(req.url);
  // No country default. An absent country means "no country context", and the
  // delivery layer then matches only globally scoped news (country_code IS
  // NULL); a country-scoped item cannot equal an empty context. Substituting a
  // country here would silently turn global news into one market's news.
  const countryCode = (url.searchParams.get("country") ?? "").toLowerCase().slice(0, 2);
  // City is meaningless without a country in the canonical geo contract, and is
  // never used to work out a country.
  const cityId = countryCode ? (url.searchParams.get("city") ?? undefined) : undefined;
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? 20)));
  const view = url.searchParams.get("view") ?? "list";

  const news = await listOfficeNews({
    countryCode,
    cityId,
    limit,
    channel: view === "ticker" ? "OFFICE_TICKER" : "OFFICE_NEWS",
  });

  if (view === "ticker") {
    return NextResponse.json({
      items: news.map((item) => ({
        id: item.id,
        titleAr: item.titleAr,
        titleEn: item.titleEn,
        titleTr: item.titleTr,
        linkUrl: item.linkUrl,
      })),
    });
  }

  return NextResponse.json({ news });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.news.read");
  if (blocked) return blocked;

  const body = (await req.json()) as Record<string, unknown>;
  const newsId = String(body.newsId ?? "").slice(0, 80);
  if (!newsId) return NextResponse.json({ error: "newsId required" }, { status: 400 });

  await recordNewsDelivery({
    newsId,
    sponsorId: auth.device.sponsorId,
    deviceId: auth.device.deviceId,
  });
  return NextResponse.json({ ok: true });
}
