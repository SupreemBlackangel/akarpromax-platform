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
  const countryCode = (url.searchParams.get("country") ?? "om").toLowerCase().slice(0, 2);
  const cityId = url.searchParams.get("city") ?? undefined;
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? 20)));
  const view = url.searchParams.get("view") ?? "list";

  const news = await listOfficeNews({
    countryCode,
    cityId,
    limit,
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
