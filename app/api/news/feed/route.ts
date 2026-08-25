import { NextRequest, NextResponse } from "next/server";
import { resolveForChannel } from "@/lib/news/delivery";
import type { NewsChannel } from "@/lib/news/contracts";
import { cached, cacheKey } from "@/lib/cache";

export const dynamic = "force-dynamic";

const PUBLIC_CHANNELS = new Set<NewsChannel>(["WEBSITE_NEWS", "WEBSITE_TICKER"]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const rawChannel = (url.searchParams.get("channel") ?? "WEBSITE_TICKER").toUpperCase();
  const channel = PUBLIC_CHANNELS.has(rawChannel as NewsChannel) ? (rawChannel as NewsChannel) : "WEBSITE_TICKER";
  const country = (url.searchParams.get("country") || "om").toLowerCase().slice(0, 2);
  const city = url.searchParams.get("city")?.toLowerCase() || null;
  const language = (url.searchParams.get("lang") || "ar").toLowerCase().slice(0, 8);
  const pagePath = url.searchParams.get("page") || "/";
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit")) || 20));

  const items = await cached(
    cacheKey(["newsfeed", channel, country, city, language, pagePath, limit]),
    30_000,
    async () => {
      const result = await resolveForChannel(
        {
          channel,
          countryCode: country,
          cityId: city,
          language,
          pagePath,
          pageGroup: null,
          userKey: null,
          sessionKey: null,
        },
        { limit },
      );

      return result.items.map((item) => ({
        id: item.id,
        titleAr: item.titleAr,
        titleEn: item.titleEn,
        titleTr: item.titleTr,
        linkUrl: item.linkUrl,
        summaryAr: item.summaryAr,
        summaryEn: item.summaryEn,
        summaryTr: item.summaryTr,
        imageUrl: item.imageUrl,
        isBreaking: item.isBreaking,
        isPinned: item.isPinned,
        category: item.category,
        tags: item.tags,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        updatedAt: item.updatedAt,
      }));
    },
  );

  return NextResponse.json({ channel, items });
}
