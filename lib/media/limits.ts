/**
 * The limits every property-media path shares.
 *
 * There were three sets of numbers. The desktop bridge
 * (lib/integration/desktop-property-publish.ts) capped an image at 6 MB and a
 * listing at 20 images; the web upload route capped at 8 MB and told the user
 * "أكبر من 8MB"; the create schema capped the array at 20 with no size rule at
 * all. So a 7 MB photo uploaded on the web was accepted and the same photo
 * published from the office application was silently dropped.
 *
 * One set of numbers, imported by both. Changing a limit here changes it
 * everywhere, including the message the user is shown.
 */

/** Largest single image, in bytes. The lower of the two former caps: what the office app already enforces. */
export const MAX_PROPERTY_IMAGE_BYTES = 6 * 1024 * 1024;

/** Images per listing. */
export const MAX_PROPERTY_IMAGES = 20;

/** Videos per listing. The desktop record carries exactly one `videoUrl`. */
export const MAX_PROPERTY_VIDEOS = 1;

/** Media rows per listing, images and videos together. */
export const MAX_PROPERTY_MEDIA = MAX_PROPERTY_IMAGES + MAX_PROPERTY_VIDEOS;

/** Image types accepted anywhere: the three the store pipeline can read and optimise. */
export const ACCEPTED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** The prefix every image the platform stores itself lives under. */
export const PROPERTY_UPLOAD_URL_PREFIX = "/uploads/properties/";

export const MAX_PROPERTY_IMAGE_MB = Math.round(MAX_PROPERTY_IMAGE_BYTES / (1024 * 1024));

/**
 * Whether a stored media URL is one this platform will serve.
 *
 * Two forms are legitimate, and they are the two the database already holds:
 * a site-relative path under the upload prefix (what storePropertyImage
 * returns, for a file the platform stores), and an absolute http(s) URL (media
 * hosted elsewhere — a YouTube video, an image already on a CDN — which the
 * bridge accepts from the office application unchanged).
 *
 * Everything else is refused: `blob:` and `data:` never survive a page reload,
 * and a bare relative path outside the upload directory points at nothing.
 */
export function isAcceptedMediaUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const value = url.trim();
  if (!value) return false;
  if (value.startsWith(PROPERTY_UPLOAD_URL_PREFIX)) return !value.includes("..");
  if (/^https?:\/\//i.test(value)) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
