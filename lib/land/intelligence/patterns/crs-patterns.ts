/**
 * CRS declaration patterns.
 *
 * A survey document states its coordinate system in a handful of shapes, and
 * it usually does so *before* the table it applies to. Each declaration is
 * returned with its position so a table can be matched to the declaration that
 * governs it rather than to whichever one appears first in the file.
 *
 * Every pattern here is bounded: no nested quantifiers, no unbounded greedy
 * groups, so none of them can backtrack catastrophically.
 */
import { isValidUtmZone, parseUtmEpsgCode, type Hemisphere } from "@/lib/geo/utm";

export type CrsDeclarationKind = "EPSG" | "UTM_ZONE" | "DATUM_ZONE" | "GEOGRAPHIC";

export interface CrsDeclaration {
  kind: CrsDeclarationKind;
  zone?: number;
  hemisphere?: Hemisphere;
  epsg?: number;
  datum?: string;
  /** Character offset of the declaration in the source text. */
  index: number;
  raw: string;
  /** Relative strength of this declaration as evidence. */
  score: number;
}

/** `EPSG:32640`, `EPSG 32640`, `EPSG code 32640`. */
const EPSG_PATTERN = /\bEPSG\s*(?:code\s*)?[:#]?\s*(\d{4,6})\b/gi;

/** `WGS84 40N`, `WGS 84 / UTM zone 40N`, `WGS84 UTM 40 N`. */
const DATUM_ZONE_PATTERN =
  /\bWGS\s*-?\s*84\b[^\n\d]{0,24}?(?:UTM\s*)?(?:zone\s*)?(\d{1,2})\s*([NS])\b/gi;

/** `UTM Zone 40N`, `UTM 40N`, `Zone 40 N`, `النطاق 40 شمال`. */
const UTM_ZONE_PATTERN =
  /(?:\bUTM\b|\bMGRS\b|\bzone\b|النطاق|نطاق|زون)[\s:#\-/]{0,4}(?:zone[\s:#\-]{0,3})?(\d{1,2})\s*([NS])?\b/gi;

/** A bare `40N` sitting on its own, e.g. as a table caption. */
const BARE_ZONE_PATTERN = /(?<![\d.\w])(\d{1,2})\s?([NS])(?![\dA-Za-z.])/g;

/** `WGS84`, `EPSG:4326`, `geographic coordinates`, `lat/long`. */
const GEOGRAPHIC_PATTERN =
  /\b(?:WGS\s*-?\s*84|EPSG\s*[:#]?\s*4326|geographic\s+coordinates?|lat(?:itude)?\s*\/\s*long?(?:itude)?)\b|نظام\s*الإحداثيات\s*الجغرافي/gi;

const SOUTHERN_WORDS = /\bsouth(?:ern)?\s+hemisphere\b|نصف\s*الكرة\s*الجنوبي/i;
const NORTHERN_WORDS = /\bnorth(?:ern)?\s+hemisphere\b|نصف\s*الكرة\s*الشمالي/i;

/**
 * Every CRS declaration in the text, strongest first at equal position.
 *
 * Scores: an EPSG code is unambiguous; a datum paired with a zone is nearly so;
 * a zone alone is weaker; a bare `40N` is weakest and only counts as a hint.
 */
export function findCrsDeclarations(text: string): CrsDeclaration[] {
  const declarations: CrsDeclaration[] = [];
  const seen = new Set<string>();

  const add = (declaration: CrsDeclaration) => {
    const key = `${declaration.kind}:${declaration.index}`;
    if (seen.has(key)) return;
    seen.add(key);
    declarations.push(declaration);
  };

  EPSG_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(EPSG_PATTERN)) {
    const code = Number.parseInt(match[1], 10);
    const utm = parseUtmEpsgCode(code);
    add({
      kind: "EPSG",
      zone: utm?.zone,
      hemisphere: utm?.hemisphere,
      epsg: code,
      index: match.index ?? 0,
      raw: match[0].trim(),
      score: utm ? 10 : code === 4326 ? 8 : 4,
    });
  }

  DATUM_ZONE_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(DATUM_ZONE_PATTERN)) {
    const zone = Number.parseInt(match[1], 10);
    if (!isValidUtmZone(zone)) continue;
    add({
      kind: "DATUM_ZONE",
      zone,
      hemisphere: match[2].toUpperCase() as Hemisphere,
      datum: "WGS84",
      index: match.index ?? 0,
      raw: match[0].trim(),
      score: 9,
    });
  }

  UTM_ZONE_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(UTM_ZONE_PATTERN)) {
    const zone = Number.parseInt(match[1], 10);
    if (!isValidUtmZone(zone)) continue;
    const letter = match[2]?.toUpperCase() as Hemisphere | undefined;
    const hemisphere = letter
      ?? (SOUTHERN_WORDS.test(text) ? "S" : NORTHERN_WORDS.test(text) ? "N" : undefined);
    add({
      kind: "UTM_ZONE",
      zone,
      hemisphere,
      index: match.index ?? 0,
      raw: match[0].trim(),
      score: letter ? 7 : 5,
    });
  }

  BARE_ZONE_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(BARE_ZONE_PATTERN)) {
    const zone = Number.parseInt(match[1], 10);
    if (!isValidUtmZone(zone)) continue;
    add({
      kind: "UTM_ZONE",
      zone,
      hemisphere: match[2].toUpperCase() as Hemisphere,
      index: match.index ?? 0,
      raw: match[0].trim(),
      score: 3,
    });
  }

  GEOGRAPHIC_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(GEOGRAPHIC_PATTERN)) {
    add({
      kind: "GEOGRAPHIC",
      datum: "WGS84",
      index: match.index ?? 0,
      raw: match[0].trim(),
      score: 6,
    });
  }

  return declarations.sort((left, right) => left.index - right.index || right.score - left.score);
}

/**
 * The declaration that governs a given position in the document.
 *
 * A survey sheet writes its CRS above the table it applies to, so the nearest
 * preceding declaration wins. A declaration that appears only after the table
 * is accepted as a fallback, since some sheets put it in a footer.
 */
export function crsDeclarationFor(
  declarations: readonly CrsDeclaration[],
  position: number,
): CrsDeclaration | undefined {
  const utmDeclarations = declarations.filter(
    (declaration) => declaration.zone !== undefined && declaration.hemisphere !== undefined,
  );
  const pool = utmDeclarations.length > 0 ? utmDeclarations : declarations;

  const preceding = pool.filter((declaration) => declaration.index <= position);
  if (preceding.length > 0) {
    return preceding.reduce((best, current) =>
      current.score > best.score
      || (current.score === best.score && current.index > best.index)
        ? current
        : best,
    );
  }

  const following = pool.filter((declaration) => declaration.index > position);
  if (following.length === 0) return undefined;
  return following.reduce((best, current) => (current.score > best.score ? current : best));
}
