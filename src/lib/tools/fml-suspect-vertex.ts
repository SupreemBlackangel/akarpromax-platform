/**
 * Which corner the deed's own distances disagree about.
 *
 * A survey sheet prints the length of every side beside the coordinates, so the
 * document carries its own answer key. When one digit of one easting is misread
 * the polygon collapses into a sliver — 13,915 m² where the deed says 990 — and
 * what the reader was told was that the AREA was 1305% out. That is true and
 * nearly useless: it names the symptom, and the reader has eight numbers to
 * audit by hand against a scan.
 *
 * The corner is already identifiable from what the resolver computed. A misread
 * corner is the one whose BOTH sides disagree with their stated lengths, while
 * the sides that do not touch it still measure what the sheet says — to the
 * centimetre. Real case, plot 36 at Salalah Airport:
 *
 *     P1→P2   983.03 m   deed says 22.02   ✗
 *     P2→P3    45.00 m   deed says 45.04   ✓
 *     P3→P4    22.00 m   deed says 22.02   ✓
 *     P4→P1   941.79 m   deed says 45.03   ✗
 *
 * P1 is in both failures and nothing else is. Its easting had been read as
 * 187930 instead of 186943.
 */

export type BoundarySegment = {
  fromIndex: number;
  toIndex: number;
  lengthMeters?: number;
  /** What the sheet states for this side, when it states one. */
  documentLengthMeters?: number;
  deviationMeters?: number;
};

/**
 * How far a side may differ from its stated length before it counts as wrong.
 *
 * These sheets round to the centimetre, and the grid distance legitimately
 * differs from the plan distance by a few centimetres — the scale factor is
 * printed on the drawing for exactly that reason (1.0007885 on this one, which
 * is 3.5cm over 45m). Half a metre is far above that and far below any
 * misreading worth reporting.
 */
export const SIDE_TOLERANCE_METERS = 0.5;

function deviationOf(segment: BoundarySegment): number | null {
  if (typeof segment.documentLengthMeters !== "number" || !Number.isFinite(segment.documentLengthMeters)) {
    return null;
  }
  if (typeof segment.deviationMeters === "number" && Number.isFinite(segment.deviationMeters)) {
    return Math.abs(segment.deviationMeters);
  }
  if (typeof segment.lengthMeters !== "number" || !Number.isFinite(segment.lengthMeters)) return null;
  return Math.abs(segment.lengthMeters - segment.documentLengthMeters);
}

/**
 * The vertex indices the stated distances accuse, in order.
 *
 * Empty when nothing is wrong, when the sheet states no distances to check
 * against, and — deliberately — when EVERY side is wrong: that is not a misread
 * corner but a misread table, a wrong zone, or a scale the reader has to look at
 * whole. Naming a corner then would send them to audit one number out of eight
 * when all eight are suspect.
 */
export function suspectVertexIndices(segments: readonly BoundarySegment[]): number[] {
  const failuresPerVertex = new Map<number, number>();
  let checked = 0;
  let failed = 0;

  for (const segment of segments) {
    const deviation = deviationOf(segment);
    if (deviation === null) continue;
    checked += 1;
    if (deviation <= SIDE_TOLERANCE_METERS) continue;
    failed += 1;
    for (const index of [segment.fromIndex, segment.toIndex]) {
      failuresPerVertex.set(index, (failuresPerVertex.get(index) ?? 0) + 1);
    }
  }

  if (checked === 0 || failed === 0 || failed === checked) return [];

  // Both of its sides, not one. A corner that fails a single side is as likely
  // to be its neighbour's fault, and naming the wrong point is worse than
  // naming none.
  return [...failuresPerVertex.entries()]
    .filter(([, count]) => count >= 2)
    .map(([index]) => index)
    .sort((a, b) => a - b);
}
