import type { MetadataRoute } from "next";
import { PUBLIC_NAV } from "@/src/config/public-navigation";

const BASE_URL = "https://akarpromax.com";

/** Additional indexable public surfaces not in the primary nav. */
const EXTRA_PUBLIC_ROUTES = [
  "/news",
  "/properties/search",
  "/auctions",
  "/land",
  "/directory",
  "/legal",
  "/privacy",
  "/terms",
];

/**
 * Static sitemap over the public product map (the same source of truth the
 * sidebar and header render from) plus secondary public routes. Served at
 * /sitemap.xml; per-entity URLs (properties, providers, news items) can be
 * appended later from the DB once their volume justifies it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const navEntries: MetadataRoute.Sitemap = PUBLIC_NAV.map((item) => ({
    url: `${BASE_URL}${item.href === "/" ? "" : item.href}`,
    lastModified: now,
    changeFrequency: item.href === "/" ? "daily" : "weekly",
    priority: item.href === "/" ? 1 : 0.8,
  }));
  const extraEntries: MetadataRoute.Sitemap = EXTRA_PUBLIC_ROUTES.map((href) => ({
    url: `${BASE_URL}${href}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));
  return [...navEntries, ...extraEntries];
}
