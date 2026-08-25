/**
 * Area statement patterns.
 *
 * A registered area is the strongest independent check on a reconstructed
 * parcel, so every wording a document uses for it is recognised — but the unit
 * is only converted when the document actually names one.
 */
import { parseAreaValue, type ParsedArea } from "@/lib/land/documents/numerals";

export interface AreaStatement extends ParsedArea {
  /** Character offset of the statement in the source text. */
  index: number;
  /** Relative strength: a labelled statement beats a bare `300 SQ.M`. */
  score: number;
}

/**
 * `AREA = 300 SQ.m`, `AREA: 300 m²`, `Total area 1,248.62 sqm`,
 * `المساحة 300 م2`, `المساحة = 300 متر مربع`.
 *
 * The value group is bounded and the unit tail is capped, so the pattern
 * cannot backtrack pathologically on a long numeric run.
 */
const LABELLED_AREA_PATTERN =
  /(?:\bTOTAL\s+AREA\b|\bAREA\b|\bSURFACE\b|المساحه|المساحة|مساحة\s*القطعة|مساحة\s*القسيمة|اجمالي\s*المساحه|إجمالي\s*المساحة)\s*(?:[=:：]\s*)?([\d٠-٩][\d٠-٩.,٫٬]{0,18}\s{0,2}(?:[A-Za-zء-ي²2.]{0,14})?)/gi;

/** A bare `300 SQ.M` / `٣٠٠ م٢` with no label, weaker evidence. */
const BARE_AREA_PATTERN =
  /([\d٠-٩][\d٠-٩.,٫٬]{0,18})\s{0,2}(sq\.?\s?m\.?|sqm|m²|m2|هكتار|ha\b|متر\s?مربع|م\s?[²2])/gi;

/** All area statements in the text, in document order. */
export function findAreaStatements(text: string): AreaStatement[] {
  const statements: AreaStatement[] = [];
  const seen = new Set<number>();

  LABELLED_AREA_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(LABELLED_AREA_PATTERN)) {
    const parsed = parseAreaValue(match[1]);
    if (!parsed) continue;
    const index = match.index ?? 0;
    seen.add(index);
    statements.push({ ...parsed, index, score: parsed.unitStated ? 10 : 7 });
  }

  BARE_AREA_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(BARE_AREA_PATTERN)) {
    const index = match.index ?? 0;
    // Skip a value already captured by its label.
    if ([...seen].some((labelled) => Math.abs(labelled - index) < 32)) continue;
    const parsed = parseAreaValue(`${match[1]} ${match[2]}`);
    if (!parsed) continue;
    statements.push({ ...parsed, index, score: 5 });
  }

  return statements.sort((left, right) => left.index - right.index);
}

/**
 * The area a document registers for its parcel: the strongest statement, and
 * among equals the one repeated most often, which is how survey sheets print
 * the registered area in both a header and a footer.
 */
export function registeredArea(text: string): AreaStatement | undefined {
  const statements = findAreaStatements(text);
  if (statements.length === 0) return undefined;

  const byValue = new Map<number, { statement: AreaStatement; count: number; score: number }>();
  for (const statement of statements) {
    const key = Math.round(statement.squareMeters * 100);
    const existing = byValue.get(key);
    if (existing) {
      existing.count += 1;
      existing.score = Math.max(existing.score, statement.score);
    } else {
      byValue.set(key, { statement, count: 1, score: statement.score });
    }
  }

  return [...byValue.values()].sort(
    (left, right) => right.score - left.score || right.count - left.count,
  )[0].statement;
}
