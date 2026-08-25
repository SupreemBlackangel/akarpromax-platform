/**
 * Multi-source consensus for coordinate extraction.
 *
 * Several independent readers can look at the same page: the native PDF
 * layout, the flattened PDF text, full-page OCR, an OCR pass over the table
 * region, a label-aware pattern matcher. Taking whichever one answers first is
 * how a parcel silently loses a corner — the fastest reader is not the most
 * complete one.
 *
 * This module collects what each reader saw, reconciles them by corner, and
 * refuses to call a result verified while the readers disagree about how many
 * corners the document has. Disagreement is the signal, not the noise.
 */
import { buildRowAccount, statusCeilingFor, type RowAccount, type RejectedRow } from "./row-accounting";
import type { Point } from "@/lib/geo/contracts";

/** Where a reading came from. Each is an independent look at the document. */
export type EvidenceSource =
  | "native_layout"
  | "native_text"
  | "ocr_full_page"
  | "ocr_roi"
  | "table_detector"
  | "regex_labelled"
  | "coordinate_cluster"
  | "country_adapter";

export interface SourceReading {
  source: EvidenceSource;
  /** Rows this reader believes the table has. */
  detectedRows: number;
  /** Corner label to position, as this reader read them. */
  points: ReadonlyMap<string, Point>;
  rejections?: readonly RejectedRow[];
}

export interface ConsensusPoint {
  pointId: string;
  point: Point;
  /** Every source that produced this corner, named — not a bare score. */
  evidence: EvidenceSource[];
  /** Sources that produced this corner at a materially different position. */
  disagreeingSources: EvidenceSource[];
  /** Largest separation between readings of this corner, in degrees. */
  spreadDegrees: number;
  status: "VERIFIED" | "REVIEW_REQUIRED";
}

export type ConsensusVerdict = "VERIFIED" | "REVIEW_REQUIRED" | "UNRESOLVED";

export interface ConsensusResult {
  points: ConsensusPoint[];
  account: RowAccount;
  verdict: ConsensusVerdict;
  /** Per source, the number of rows it reported — kept for the review view. */
  sourceRowCounts: { source: EvidenceSource; detectedRows: number; points: number }[];
  agreementSources: number;
  warnings: string[];
}

/**
 * Two readings of the same corner are the same corner when they sit within
 * this many degrees. Roughly a decimetre — far tighter than any real parcel
 * vertex spacing, loose enough for a rounding difference between readers.
 */
export const POINT_AGREEMENT_DEGREES = 0.000002;

/**
 * Which reader is believed when two of them read the same page differently.
 *
 * The order is by how much of the page's own structure the reader preserved.
 * A table object embedded in the document says what its columns are; a table
 * rebuilt from glyph positions infers them but still sees the columns; a
 * label-driven regex sees neither, and a bare numeric cluster sees nothing at
 * all. Row count still comes first — a reader that saw more of the table has
 * lost less of it — and this order settles the ties.
 */
export const SOURCE_PRIORITY: Readonly<Record<EvidenceSource, number>> = {
  table_detector: 100,
  native_layout: 90,
  ocr_roi: 80,
  ocr_full_page: 70,
  regex_labelled: 60,
  native_text: 50,
  coordinate_cluster: 30,
  country_adapter: 10,
};

/** Higher wins. Unknown sources rank below every named one. */
export function sourcePriority(source: EvidenceSource): number {
  return SOURCE_PRIORITY[source] ?? 0;
}

export function reconcileCandidates(readings: readonly SourceReading[]): ConsensusResult {
  const warnings: string[] = [];
  const usable = readings.filter((reading) => reading.points.size > 0 || reading.detectedRows > 0);

  if (usable.length === 0) {
    return {
      points: [],
      account: buildRowAccount({ detectedRows: 0, parsedRows: 0, acceptedRows: 0, rejections: [] }),
      verdict: "UNRESOLVED",
      sourceRowCounts: [],
      agreementSources: 0,
      warnings: ["no extractor produced a coordinate candidate"],
    };
  }

  const sourceRowCounts = usable.map((reading) => ({
    source: reading.source,
    detectedRows: reading.detectedRows,
    points: reading.points.size,
  }));

  // The document has as many rows as the most complete reader saw. A reader
  // that saw fewer has lost something, and that is what must be investigated
  // rather than quietly adopted.
  const detectedRows = Math.max(...usable.map((r) => Math.max(r.detectedRows, r.points.size)));

  const labels = new Set<string>();
  for (const reading of usable) for (const label of reading.points.keys()) labels.add(label);

  const points: ConsensusPoint[] = [];
  for (const label of [...labels].sort(compareLabels)) {
    const readingsFor = usable
      .filter((reading) => reading.points.has(label))
      .map((reading) => ({ source: reading.source, point: reading.points.get(label) as Point }));

    const primary = readingsFor[0].point;
    let spread = 0;
    const agreeing: EvidenceSource[] = [];
    const disagreeing: EvidenceSource[] = [];
    for (const entry of readingsFor) {
      const distance = Math.max(
        Math.abs(entry.point.lat - primary.lat),
        Math.abs(entry.point.lon - primary.lon),
      );
      spread = Math.max(spread, distance);
      if (distance <= POINT_AGREEMENT_DEGREES) agreeing.push(entry.source);
      else disagreeing.push(entry.source);
    }

    if (disagreeing.length > 0) {
      warnings.push(`corner ${label} was read differently by ${disagreeing.join(", ")}`);
    }

    points.push({
      pointId: label,
      point: primary,
      evidence: agreeing,
      disagreeingSources: disagreeing,
      spreadDegrees: spread,
      status: disagreeing.length === 0 ? "VERIFIED" : "REVIEW_REQUIRED",
    });
  }

  const acceptedRows = points.filter((p) => p.status === "VERIFIED").length;

  const rejections: RejectedRow[] = [];
  for (const point of points) {
    if (point.status === "REVIEW_REQUIRED") {
      rejections.push({
        rowIndex: -1,
        pointId: point.pointId,
        reason: "OCR_CONFLICT",
        detail: `sources disagree: ${point.disagreeingSources.join(", ")}`,
      });
    }
  }
  for (const reading of usable) {
    for (const rejection of reading.rejections ?? []) rejections.push(rejection);
  }

  const shortReaders = sourceRowCounts.filter((s) => Math.max(s.detectedRows, s.points) < detectedRows);
  if (shortReaders.length > 0) {
    warnings.push(
      `row-count disagreement: ${shortReaders.map((s) => `${s.source} saw ${Math.max(s.detectedRows, s.points)}`).join(", ")}, ` +
      `while the most complete reader saw ${detectedRows}`,
    );
  }

  const account = buildRowAccount({
    detectedRows,
    parsedRows: labels.size,
    acceptedRows,
    rejections,
  });

  let verdict: ConsensusVerdict = statusCeilingFor(account);
  if (verdict === "VERIFIED" && shortReaders.length > 0) {
    // Every corner agreed, but a reader still saw fewer rows than another.
    // The sixth row has to be explained before this can be called verified.
    verdict = "REVIEW_REQUIRED";
  }

  const agreementSources = new Set(points.flatMap((p) => p.evidence)).size;

  return { points, account, verdict, sourceRowCounts, agreementSources, warnings };
}

/** `P2` before `P10`; anything non-numeric falls back to string order. */
function compareLabels(a: string, b: string): number {
  const na = Number(a.replace(/^[A-Za-z]+/, ""));
  const nb = Number(b.replace(/^[A-Za-z]+/, ""));
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
}
