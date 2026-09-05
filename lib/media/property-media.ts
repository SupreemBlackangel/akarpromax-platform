import {
  MAX_PROPERTY_IMAGES,
  MAX_PROPERTY_MEDIA,
  MAX_PROPERTY_VIDEOS,
  isAcceptedMediaUrl,
} from "@/lib/media/limits";

/**
 * One shape for a property's media, whichever door the listing came through.
 *
 * The web form posts `media: [{ url, type }]`; the office application posts
 * `images: string[]` and `videoUrl: string`. Both used to build their
 * `property_media` rows themselves, with the same intent and different
 * results — most visibly for a listing whose only medium is a video, where the
 * bridge left `is_featured` false on every row and the listing showed no cover
 * anywhere.
 *
 * Both now hand their input to `normalizePropertyMedia` and insert what comes
 * back. The output is the canonical row shape, so the same media through
 * either door produces the same rows.
 */

export type PropertyMediaType = "image" | "video";

/** One media row, exactly as `property_media` stores it. */
export type NormalizedMedia = {
  url: string;
  type: PropertyMediaType;
  /** Dense, 0-based, images before videos. */
  order: number;
  /** True on exactly one row when the listing has any media. */
  isFeatured: boolean;
  altText: string;
};

export type MediaInput =
  | string
  | {
      url?: unknown;
      type?: unknown;
      altText?: unknown;
      /** Honoured when present; otherwise the cover is the first image. */
      isFeatured?: unknown;
    };

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readItem(item: MediaInput): { url: string; type: PropertyMediaType; altText: string; isFeatured: boolean } | null {
  if (typeof item === "string") {
    const url = item.trim();
    return isAcceptedMediaUrl(url) ? { url, type: "image", altText: "", isFeatured: false } : null;
  }
  if (!item || typeof item !== "object") return null;
  const url = text(item.url, 2000);
  if (!isAcceptedMediaUrl(url)) return null;
  return {
    url,
    type: item.type === "video" ? "video" : "image",
    altText: text(item.altText, 200),
    isFeatured: item.isFeatured === true,
  };
}

/**
 * Canonical media rows for one listing.
 *
 * - Anything that is not a URL this platform serves is dropped, so no row ever
 *   holds a `blob:` or a half-typed string, and no null lands in the array.
 * - A URL repeated is kept once: re-publishing from the office application
 *   sends the whole list again, and the same photo must not become two rows.
 * - Images come first, then videos, which is the order the bridge already
 *   produced and the order the listing card expects.
 * - `order` is dense and 0-based; `isFeatured` is true on exactly one row.
 *   The cover is the caller's choice if it marked one, else the first image,
 *   else the first row — so a video-only listing has a cover too.
 * - Counts are capped by the shared limits rather than by the caller.
 */
export function normalizePropertyMedia(input: unknown): NormalizedMedia[] {
  const items = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const images: ReturnType<typeof readItem>[] = [];
  const videos: ReturnType<typeof readItem>[] = [];

  for (const raw of items) {
    if (images.length + videos.length >= MAX_PROPERTY_MEDIA) break;
    const item = readItem(raw as MediaInput);
    if (!item || seen.has(item.url)) continue;
    seen.add(item.url);
    if (item.type === "video") {
      if (videos.length < MAX_PROPERTY_VIDEOS) videos.push(item);
    } else if (images.length < MAX_PROPERTY_IMAGES) {
      images.push(item);
    }
  }

  const ordered = [...images, ...videos].filter((item): item is NonNullable<typeof item> => item !== null);
  if (ordered.length === 0) return [];

  const markedCover = ordered.findIndex((item) => item.isFeatured);
  const firstImage = ordered.findIndex((item) => item.type === "image");
  const coverIndex = markedCover >= 0 ? markedCover : firstImage >= 0 ? firstImage : 0;

  return ordered.map((item, index) => ({
    url: item.url,
    type: item.type,
    order: index,
    isFeatured: index === coverIndex,
    altText: item.altText,
  }));
}

/**
 * The office application's `images[] + videoUrl` shape as one media list, so
 * the bridge and the web form reach `normalizePropertyMedia` the same way.
 * Image URLs are already resolved by then (a data: URL has been stored and
 * replaced by its /uploads/properties/... path).
 */
export function mediaFromDesktopPayload(imageUrls: string[], videoUrl: string): MediaInput[] {
  const list: MediaInput[] = imageUrls.map((url) => ({ url, type: "image" as const }));
  if (videoUrl.trim()) list.push({ url: videoUrl.trim(), type: "video" as const });
  return list;
}
