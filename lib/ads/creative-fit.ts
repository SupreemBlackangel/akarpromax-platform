import { AD_PLACEMENTS } from "@/src/constants/advertising";

/**
 * Does a creative's pixel size suit the placements it will run in?
 *
 * Placements advertise an aspect ratio (3:2 hero, 4:5 rails, 3:2 bottom) but
 * nothing ever checked an uploaded creative against it, so one image was
 * stretched across slots of very different shapes and silently cropped. Now
 * that creatives record their intrinsic size, the admin can be warned before a
 * campaign goes live rather than discovering it on the page.
 *
 * This warns; it never blocks. A deliberate off-ratio creative is still valid —
 * `object-fit` handles it — the point is that the choice becomes visible.
 */

/** Relative tolerance before a mismatch is worth mentioning (±12%). */
export const ASPECT_TOLERANCE = 0.12;

export type CreativeFitIssue = {
  placement: string;
  placementLabel: string;
  expected: string;
  expectedRatio: number;
  actualRatio: number;
  /** How far off, as a fraction of the expected ratio. */
  drift: number;
  severity: "warn" | "severe";
};

/** "3:2" -> 1.5 */
export function parseAspectRatio(value: string | null | undefined): number | null {
  if (!value) return null;
  const [w, h] = value.split(":").map((part) => Number(part.trim()));
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return w / h;
}

/**
 * Check one creative size against every placement a campaign targets.
 * Returns one issue per mismatching placement, worst first.
 */
export function checkCreativeFit(
  width: number | null | undefined,
  height: number | null | undefined,
  placements: readonly string[],
): CreativeFitIssue[] {
  if (!width || !height || width <= 0 || height <= 0) return [];
  const actualRatio = width / height;
  const issues: CreativeFitIssue[] = [];

  for (const placement of placements) {
    const meta = AD_PLACEMENTS[placement];
    const expectedRatio = parseAspectRatio(meta?.aspectRatio);
    if (!meta || expectedRatio === null) continue;

    const drift = Math.abs(actualRatio - expectedRatio) / expectedRatio;
    if (drift <= ASPECT_TOLERANCE) continue;

    issues.push({
      placement,
      placementLabel: meta.label?.ar ?? placement,
      expected: meta.aspectRatio as string,
      expectedRatio,
      actualRatio,
      drift,
      // Past a third off, the crop is severe enough to lose real content.
      severity: drift > 0.33 ? "severe" : "warn",
    });
  }

  return issues.sort((a, b) => b.drift - a.drift);
}

/** The closest pixel size for a placement, to suggest in the UI. */
export function suggestedSize(aspectRatio: string | null | undefined, targetWidth = 1200): { width: number; height: number } | null {
  const ratio = parseAspectRatio(aspectRatio);
  if (ratio === null) return null;
  return { width: targetWidth, height: Math.round(targetWidth / ratio) };
}
