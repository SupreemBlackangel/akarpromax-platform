import {
  CoordinateEvidence,
  GeoEvidence,
  ParcelEvidence,
  AddressEvidence,
  Point,
} from "./contracts";
import { CONTEXT_WINDOW_CHARS, admitLooseDecimalPair, contextWindow } from "./decimal-admission";
import {
  DECIMAL_PAIR_PATTERN,
  collectDmsComponents,
  collectHemisphereDecimalTokens,
  parseDecimalLatLon,
  parseDmsLatLon,
  parseHemisphereDecimalLatLon,
} from "./coordinate-parsing";

// Canonical worldwide parsers live in ./coordinate-parsing. They are re-exported
// here so the many existing importers of this module keep working unchanged.
export {
  parseDecimalLatLon,
  parseDecimalLatLonDetailed,
  parseDmsLatLon,
  parseHemisphereDecimalLatLon,
} from "./coordinate-parsing";

// A private instance so `lastIndex` is never shared with other modules.
const DECIMAL_REGEX = new RegExp(DECIMAL_PAIR_PATTERN.source, "g");

// Municipal survey PDFs commonly emit a whole row as
// `N 21.885... E 39.205... 22470581`. Match the two labelled decimals as
// one row before the generic token scan so a preceding value such as an area
// (`600 N ...`) cannot consume the hemisphere letter and join two rows.
const LABELED_DECIMAL_PAIR_REGEX =
  /\b(?:\d{5,}\s+(?:(?:[NS])\s*-?\d{1,2}\.\d{2,15}\s+(?:[EW])\s*-?\d{1,3}\.\d{2,15}|(?:[EW])\s*-?\d{1,3}\.\d{2,15}\s+(?:[NS])\s*-?\d{1,2}\.\d{2,15}|-?\d{1,2}\.\d{2,15}\s*(?:[NS])\s+-?\d{1,3}\.\d{2,15}\s*(?:[EW])|-?\d{1,3}\.\d{2,15}\s*(?:[EW])\s+-?\d{1,2}\.\d{2,15}\s*(?:[NS]))|(?:(?:[NS])\s*-?\d{1,2}\.\d{2,15}\s+(?:[EW])\s*-?\d{1,3}\.\d{2,15}|(?:[EW])\s*-?\d{1,3}\.\d{2,15}\s+(?:[NS])\s*-?\d{1,2}\.\d{2,15}|-?\d{1,2}\.\d{2,15}\s*(?:[NS])\s+-?\d{1,3}\.\d{2,15}\s*(?:[EW])|-?\d{1,3}\.\d{2,15}\s*(?:[EW])\s+-?\d{1,2}\.\d{2,15}\s*(?:[NS]))(?:\s+\d{5,})?)/gi;

const UTM_REGEX =
  /(?:\b(?:UTM|MGRS)\s*)?(\d{1,2})\s*([NSEWnsew])\s*(\d{5,6}(?:\.\d+)?)\s*[,;\s]\s*(\d{6,7}(?:\.\d+)?)/gi;

const GRID_TABLE_HEADER_REGEX = /(?:\bLINE\s+)?\bNORTHING\s+EASTING\b(?:\s+DIST(?:ANCE)?\s*\(?M\)?)?/gi;
const GRID_TABLE_ROW_REGEX =
  /\b(\d{1,3})\s+(\d{1,3})\s+([0-9][0-9.,]{5,11})\s+([0-9][0-9.,]{5,11})(?:\s+([0-9][0-9.,]{0,7}))?(?:\s+[^0-9A-Za-z\r\n]{0,4}\s*OCRCONF\s+(\d{1,3})\s+(\d{1,3}))?/g;

/**
 * The same row without a distance column. Tables that omit distances would
 * otherwise have the next row's line number swallowed as a distance, halving
 * the number of corners that get read.
 */
const GRID_TABLE_ROW_NO_DISTANCE_REGEX =
  /\b(\d{1,3})\s+(\d{1,3})\s+([0-9][0-9.,]{5,11})\s+([0-9][0-9.,]{5,11})(?:\s+[^0-9A-Za-z\r\n]{0,4}\s*OCRCONF\s+(\d{1,3})\s+(\d{1,3}))?/g;

export interface ZoneLessUtmRow {
  lineStart: string;
  lineEnd: string;
  northing: number;
  easting: number;
  distance?: number;
  raw: string;
  northingToken: string;
  eastingToken: string;
  northingConfidence?: number;
  eastingConfidence?: number;
  ocrCorrected?: boolean;
}

interface GridValueCandidate {
  value: number;
  edits: number;
  correctionCost: number;
}

function normalizeGridCoordinate(token: string, axis: "northing" | "easting"): number | null {
  const normalized = token.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  if (!normalized) return null;

  const min = axis === "northing" ? 1_000_000 : 100_000;
  const max = axis === "northing" ? 10_000_000 : 900_000;
  if (normalized.includes(".")) {
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
  }

  const expectedIntegerDigits = axis === "northing" ? 7 : 6;
  const candidates = Array.from({ length: 4 }, (_, decimalPlaces) => {
    const integerDigits = normalized.length - decimalPlaces;
    const value = Number(normalized) / 10 ** decimalPlaces;
    const score = Math.abs(integerDigits - expectedIntegerDigits) * 10 + Math.abs(decimalPlaces - 2);
    return { value, score };
  })
    .filter(({ value }) => Number.isFinite(value) && value >= min && value <= max)
    .sort((left, right) => left.score - right.score);

  return candidates[0]?.value ?? null;
}

function normalizeSurveyDistance(token?: string): number | undefined {
  if (!token) return undefined;
  const normalized = token.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  if (!normalized) return undefined;
  if (normalized.includes(".")) {
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) && parsed > 0 && parsed < 100_000 ? parsed : undefined;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  if (parsed >= 1_000 && parsed <= 99_999) return parsed / 100;
  return parsed;
}

const OCR_DIGIT_ALTERNATIVES: Readonly<Record<string, readonly string[]>> = {
  "0": ["9", "8", "6"],
  "8": ["9", "0", "6"],
  "9": ["0", "8", "6", "5"],
  "6": ["5", "8", "9", "0"],
  "5": ["6", "8", "9", "3"],
  "3": ["8", "9", "5"],
  "1": ["7"],
  "7": ["1"],
};

function gridValueCandidates(
  token: string,
  axis: "northing" | "easting",
  confidence = 50,
): GridValueCandidate[] {
  const normalizedToken = token.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const candidates = new Map<string, GridValueCandidate>();
  const add = (value: number | null, edits: number) => {
    if (value === null) return;
    const key = value.toFixed(4);
    const current = candidates.get(key);
    const correctionCost = edits === 0 ? 0 : 1 + Math.max(0, Math.min(100, confidence)) / 100;
    if (!current || correctionCost < current.correctionCost || (correctionCost === current.correctionCost && edits < current.edits)) {
      candidates.set(key, { value, edits, correctionCost });
    }
  };

  add(normalizeGridCoordinate(normalizedToken, axis), 0);
  const firstPass: { index: number; value: string }[] = [];
  for (let index = 0; index < normalizedToken.length; index += 1) {
    const alternatives = OCR_DIGIT_ALTERNATIVES[normalizedToken[index]] ?? [];
    for (const replacement of alternatives) {
      const variant = `${normalizedToken.slice(0, index)}${replacement}${normalizedToken.slice(index + 1)}`;
      add(normalizeGridCoordinate(variant, axis), 1);
      firstPass.push({ index, value: variant });
    }
  }
  for (const first of firstPass) {
    for (let index = first.index + 1; index < normalizedToken.length; index += 1) {
      const alternatives = OCR_DIGIT_ALTERNATIVES[first.value[index]] ?? [];
      for (const replacement of alternatives) {
        const variant = `${first.value.slice(0, index)}${replacement}${first.value.slice(index + 1)}`;
        add(normalizeGridCoordinate(variant, axis), 2);
      }
    }
  }

  return Array.from(candidates.values());
}

function compactCandidateWindow(
  candidateRows: readonly GridValueCandidate[][],
  maxSpan: number,
): GridValueCandidate[][] | null {
  const flattened = candidateRows
    .flatMap((candidates, rowIndex) => candidates.map((candidate) => ({ ...candidate, rowIndex })))
    .sort((left, right) => left.value - right.value);
  let best: { left: number; right: number; score: number } | null = null;

  for (let left = 0; left < flattened.length; left += 1) {
    let right = left;
    while (right + 1 < flattened.length && flattened[right + 1].value - flattened[left].value <= maxSpan) {
      right += 1;
    }
    const window = flattened.slice(left, right + 1);
    if (new Set(window.map((entry) => entry.rowIndex)).size !== candidateRows.length) continue;
    let editCost = 0;
    let digitEdits = 0;
    for (let rowIndex = 0; rowIndex < candidateRows.length; rowIndex += 1) {
      const rowEntries = window.filter((entry) => entry.rowIndex === rowIndex);
      const rowCost = Math.min(...rowEntries.map((entry) => entry.correctionCost));
      editCost += rowCost;
      digitEdits += Math.min(...rowEntries.filter((entry) => entry.correctionCost === rowCost).map((entry) => entry.edits));
    }
    const span = flattened[right].value - flattened[left].value;
    const score = editCost * 1_000_000 + digitEdits * 10_000 + span;
    if (!best || score < best.score) best = { left, right, score };
  }

  if (!best) return null;
  const min = flattened[best.left].value;
  const max = flattened[best.right].value;
  return candidateRows.map((candidates) => candidates.filter((candidate) => candidate.value >= min && candidate.value <= max));
}

function planarSurveyArea(points: readonly { northing: number; easting: number }[]): number {
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    twiceArea += points[index].easting * next.northing - next.easting * points[index].northing;
  }
  return Math.abs(twiceArea) / 2;
}

function surveyConstraintScore(
  points: readonly { northing: number; easting: number; edits: number; northingEdits: number; eastingEdits: number }[],
  rows: readonly ZoneLessUtmRow[],
  declaredArea?: number,
): number {
  let score = points.reduce((total, point) => total + point.edits * 0.001, 0);
  for (let index = 0; index < points.length; index += 1) {
    const declaredDistance = rows[index].distance;
    if (!declaredDistance) continue;
    const next = points[(index + 1) % points.length];
    const measured = Math.hypot(next.easting - points[index].easting, next.northing - points[index].northing);
    score += (measured - declaredDistance) ** 2 * 10;
  }
  if (declaredArea && declaredArea > 0) {
    score += (planarSurveyArea(points) - declaredArea) ** 2 * 0.1;
  }
  return score;
}

function repairSurveyOcrRows(rows: ZoneLessUtmRow[], declaredArea?: number): ZoneLessUtmRow[] {
  if (rows.length < 3 || rows.some((row) => !row.distance)) return rows;
  const maxSpan = Math.max(10, Math.max(...rows.map((row) => row.distance ?? 0)) * 1.6);
  const northingCandidates = compactCandidateWindow(
    rows.map((row) => gridValueCandidates(row.northingToken, "northing", row.northingConfidence)),
    maxSpan,
  );
  const eastingCandidates = compactCandidateWindow(
    rows.map((row) => gridValueCandidates(row.eastingToken, "easting", row.eastingConfidence)),
    maxSpan,
  );
  if (!northingCandidates || !eastingCandidates) return rows;

  const selected = rows.map((row, rowIndex) => {
    const northing = [...northingCandidates[rowIndex]].sort((left, right) => left.correctionCost - right.correctionCost || left.edits - right.edits || Math.abs(left.value - row.northing) - Math.abs(right.value - row.northing))[0];
    const easting = [...eastingCandidates[rowIndex]].sort((left, right) => left.correctionCost - right.correctionCost || left.edits - right.edits || Math.abs(left.value - row.easting) - Math.abs(right.value - row.easting))[0];
    return {
      northing: northing.value,
      easting: easting.value,
      edits: northing.edits + easting.edits,
      northingEdits: northing.edits,
      eastingEdits: easting.edits,
    };
  });

  for (let iteration = 0; iteration < 4; iteration += 1) {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      let best = selected[rowIndex];
      let bestScore = surveyConstraintScore(selected, rows, declaredArea);
      const northingConfidence = rows[rowIndex].northingConfidence;
      const eastingConfidence = rows[rowIndex].eastingConfidence;
      const refineNorthing = selected[rowIndex].northingEdits === 0
        && northingConfidence !== undefined
        && northingConfidence <= 80;
      const refineEasting = selected[rowIndex].eastingEdits === 0
        && eastingConfidence !== undefined
        && eastingConfidence <= 80;
      const localNorthingCandidates = refineNorthing
        ? northingCandidates[rowIndex].filter((candidate) => candidate.edits <= 1 && Math.abs(candidate.value - rows[rowIndex].northing) <= 0.2)
        : [{ value: selected[rowIndex].northing, edits: selected[rowIndex].northingEdits, correctionCost: 0 }];
      const localEastingCandidates = refineEasting
        ? eastingCandidates[rowIndex].filter((candidate) => candidate.edits <= 1 && Math.abs(candidate.value - rows[rowIndex].easting) <= 0.2)
        : [{ value: selected[rowIndex].easting, edits: selected[rowIndex].eastingEdits, correctionCost: 0 }];
      for (const northing of localNorthingCandidates) {
        for (const easting of localEastingCandidates) {
          const candidate = {
            northing: northing.value,
            easting: easting.value,
            edits: northing.edits + easting.edits,
            northingEdits: northing.edits,
            eastingEdits: easting.edits,
          };
          const attempt = selected.with(rowIndex, candidate);
          const score = surveyConstraintScore(attempt, rows, declaredArea);
          if (score < bestScore) {
            best = candidate;
            bestScore = score;
          }
        }
      }
      selected[rowIndex] = best;
    }
  }

  return rows.map((row, index) => ({
    ...row,
    northing: selected[index].northing,
    easting: selected[index].easting,
    ocrCorrected: selected[index].northing !== row.northing || selected[index].easting !== row.easting,
  }));
}



// Oman cadastral drawings (Krooki) often encode the survey schedule as
// `LINE | EASTING | NORTHING | DIST`.  In many searchable PDFs the text layer
// is emitted column-by-column instead of row-by-row: all LINE values first,
// then all Eastings, then all Northings.  The normal row parser cannot recover
// that layout from flat text, so this small structural fallback reconstructs
// the rows without guessing coordinates.
const LINE_PAIR_TOKEN_REGEX = /\b(\d{1,4})\s*[-–—]\s*(\d{1,4})\b/g;
const LINE_GRID_ROW_REGEX =
  /\b(\d{1,4})\s*[-–—]\s*(\d{1,4})\s+([0-9][0-9.,]{4,12})\s+([0-9][0-9.,]{4,12})(?:\s+([0-9][0-9.,]{0,8}))?/g;
const COLUMNAR_GRID_HEADER_REGEX =
  /(?:(EASTING)[\s\S]{0,48}?(NORTHING)|(NORTHING)[\s\S]{0,48}?(EASTING))(?:[\s\S]{0,24}?DIST(?:ANCE)?\s*\(?M\)?)?/gi;
const LARGE_GRID_NUMBER_REGEX = /(?<![\d./-])(\d{5,7}(?:[.,]\d+)?)(?![\d./-])/g;
const DISTANCE_NUMBER_REGEX = /(?<![\d./-])(\d{1,5}[.,]\d{1,3})(?![\d./-])/g;

interface LinePairToken {
  start: string;
  end: string;
  raw: string;
}

interface PositionedNumericToken {
  token: string;
  value: number;
  index: number;
  end: number;
}

function longestConnectedLineChain(prefix: string): LinePairToken[] {
  LINE_PAIR_TOKEN_REGEX.lastIndex = 0;
  const pairs = Array.from(prefix.matchAll(LINE_PAIR_TOKEN_REGEX)).map((match) => ({
    start: match[1],
    end: match[2],
    raw: match[0],
  }));
  let best: LinePairToken[] = [];
  for (let start = 0; start < pairs.length; start += 1) {
    const chain = [pairs[start]];
    for (let index = start + 1; index < pairs.length; index += 1) {
      if (chain[chain.length - 1].end !== pairs[index].start) break;
      chain.push(pairs[index]);
    }
    if (chain.length > best.length) best = chain;
  }
  return best.length >= 3 ? best : [];
}

function compactAxisRun(
  text: string,
  axis: "easting" | "northing",
  count: number,
  afterIndex = 0,
): PositionedNumericToken[] {
  LARGE_GRID_NUMBER_REGEX.lastIndex = 0;
  const candidates: PositionedNumericToken[] = [];
  for (const match of text.matchAll(LARGE_GRID_NUMBER_REGEX)) {
    const index = match.index ?? 0;
    if (index < afterIndex) continue;
    const value = normalizeGridCoordinate(match[1], axis);
    if (value === null) continue;
    candidates.push({ token: match[1], value, index, end: index + match[0].length });
  }

  for (let start = 0; start + count <= candidates.length; start += 1) {
    const run = candidates.slice(start, start + count);
    // Real coordinate columns are compact in the extracted text even when the
    // PDF emitted them as a vertical block.  This prevents a handful of large
    // unrelated numbers spread through the document from becoming a parcel.
    if (run[run.length - 1].end - run[0].index <= Math.max(420, count * 140)) return run;
  }
  return [];
}

function compactDistanceRun(text: string, count: number, afterIndex = 0): Array<PositionedNumericToken> {
  DISTANCE_NUMBER_REGEX.lastIndex = 0;
  const candidates: PositionedNumericToken[] = [];
  for (const match of text.matchAll(DISTANCE_NUMBER_REGEX)) {
    const index = match.index ?? 0;
    if (index < afterIndex) continue;
    const value = normalizeSurveyDistance(match[1]);
    if (value === undefined || value <= 0 || value >= 100_000) continue;
    candidates.push({ token: match[1], value, index, end: index + match[0].length });
  }
  for (let start = 0; start + count <= candidates.length; start += 1) {
    const run = candidates.slice(start, start + count);
    if (run[run.length - 1].end - run[0].index <= Math.max(320, count * 100)) return run;
  }
  return [];
}

/** Reads normal row-wise `1-2 EASTING NORTHING DIST` cadastral schedules. */
export function extractLineGridRows(text: string): ZoneLessUtmRow[] {
  const batches: ZoneLessUtmRow[][] = [];
  COLUMNAR_GRID_HEADER_REGEX.lastIndex = 0;
  for (const header of Array.from(text.matchAll(COLUMNAR_GRID_HEADER_REGEX))) {
    const eastingFirst = Boolean(header[1]);
    const start = (header.index ?? 0) + header[0].length;
    const segment = text.slice(start, start + 2_400);
    LINE_GRID_ROW_REGEX.lastIndex = 0;
    const rows: ZoneLessUtmRow[] = [];
    for (const match of segment.matchAll(LINE_GRID_ROW_REGEX)) {
      const firstToken = match[3];
      const secondToken = match[4];
      const eastingToken = eastingFirst ? firstToken : secondToken;
      const northingToken = eastingFirst ? secondToken : firstToken;
      const easting = normalizeGridCoordinate(eastingToken, "easting");
      const northing = normalizeGridCoordinate(northingToken, "northing");
      if (easting === null || northing === null) continue;
      rows.push({
        lineStart: match[1],
        lineEnd: match[2],
        easting,
        northing,
        distance: normalizeSurveyDistance(match[5]),
        raw: match[0].trim(),
        eastingToken,
        northingToken,
      });
    }
    if (rows.length >= 3) batches.push(rows);
  }
  return batches.sort((left, right) => gridBatchScore(right) - gridBatchScore(left))[0] ?? [];
}

/**
 * Reconstructs a flattened column-wise cadastral schedule.  It requires an
 * explicit Easting/Northing header plus a connected LINE chain, then accepts
 * only compact numeric runs in valid UTM ranges.  No country or zone is needed
 * to read the source table itself.
 */
export function extractColumnarLineGridRows(text: string): ZoneLessUtmRow[] {
  const batches: ZoneLessUtmRow[][] = [];
  COLUMNAR_GRID_HEADER_REGEX.lastIndex = 0;
  for (const header of Array.from(text.matchAll(COLUMNAR_GRID_HEADER_REGEX))) {
    const headerIndex = header.index ?? 0;
    const lineChain = longestConnectedLineChain(text.slice(Math.max(0, headerIndex - 700), headerIndex));
    if (lineChain.length < 3) continue;

    const eastingFirst = Boolean(header[1]);
    const start = headerIndex + header[0].length;
    const segment = text.slice(start, start + 9_000);
    const count = lineChain.length;

    const firstAxis = eastingFirst ? "easting" as const : "northing" as const;
    const secondAxis = eastingFirst ? "northing" as const : "easting" as const;
    const firstRun = compactAxisRun(segment, firstAxis, count);
    if (firstRun.length !== count) continue;
    const secondRun = compactAxisRun(segment, secondAxis, count, firstRun[firstRun.length - 1].end);
    if (secondRun.length !== count) continue;

    const eastings = eastingFirst ? firstRun : secondRun;
    const northings = eastingFirst ? secondRun : firstRun;
    const afterCoordinates = Math.max(eastings[eastings.length - 1].end, northings[northings.length - 1].end);
    const distances = compactDistanceRun(segment, count, afterCoordinates);

    const rows = lineChain.map((line, index): ZoneLessUtmRow => ({
      lineStart: line.start,
      lineEnd: line.end,
      easting: eastings[index].value,
      northing: northings[index].value,
      distance: distances[index]?.value,
      raw: `${line.raw} ${eastings[index].token} ${northings[index].token}${distances[index] ? ` ${distances[index].token}` : ""}`,
      eastingToken: eastings[index].token,
      northingToken: northings[index].token,
    }));
    if (rows.length >= 3) batches.push(rows);
  }
  return batches.sort((left, right) => gridBatchScore(right) - gridBatchScore(left))[0] ?? [];
}

function gridBatchScore(rows: readonly ZoneLessUtmRow[]): number {
  if (rows.length < 2) return Number.NEGATIVE_INFINITY;
  let score = rows.length * 1_000;
  const northings = rows.map((row) => row.northing);
  const eastings = rows.map((row) => row.easting);
  const span = Math.max(...northings) - Math.min(...northings) + Math.max(...eastings) - Math.min(...eastings);
  score -= Math.log1p(Math.max(0, span)) * 35;

  for (let index = 0; index < rows.length; index += 1) {
    const declared = rows[index].distance;
    if (!declared) continue;
    const next = rows[(index + 1) % rows.length];
    const measured = Math.hypot(next.easting - rows[index].easting, next.northing - rows[index].northing);
    score -= Math.min(1_000, Math.abs(measured - declared)) * 4;
  }
  return score;
}

/**
 * Extracts municipal survey-table rows that omit the UTM zone. OCR engines
 * frequently drop the decimal separator in these numeric columns, so the
 * separator is restored only when the resulting value has a valid UTM range.
 */
export function extractZoneLessUtmRows(text: string): ZoneLessUtmRow[] {
  GRID_TABLE_HEADER_REGEX.lastIndex = 0;
  const headers = Array.from(text.matchAll(GRID_TABLE_HEADER_REGEX));
  const batches: ZoneLessUtmRow[][] = [];

  for (const header of headers) {
    const start = (header.index ?? 0) + header[0].length;
    const tail = text.slice(start, start + 1_200);
    const areaIndex = tail.search(/\bAREA\s*(?:=|:)?\s*\d/i);
    const markerIndex = tail.search(/\bNUMERIC\s+TABLE\s+OCR\b/i);
    const possibleEnds = [areaIndex, markerIndex].filter((value) => value >= 0);
    const segmentEnd = possibleEnds.length ? Math.min(...possibleEnds) : 800;
    const segment = tail.slice(0, segmentEnd);
    const declaredAreaMatch = tail.slice(segmentEnd, segmentEnd + 120).match(/\bAREA\s*=?\s*([\d,.]+)\s*SQ\.?\s*M\.?/i);
    const declaredArea = declaredAreaMatch ? Number.parseFloat(declaredAreaMatch[1].replace(/,/g, "")) : undefined;
    const scanRows = (pattern: RegExp, withDistance: boolean): ZoneLessUtmRow[] => {
      pattern.lastIndex = 0;
      const found: ZoneLessUtmRow[] = [];
      for (const match of segment.matchAll(pattern)) {
        const northing = normalizeGridCoordinate(match[3], "northing");
        const easting = normalizeGridCoordinate(match[4], "easting");
        if (northing === null || easting === null) continue;
        const confidenceIndex = withDistance ? 6 : 5;
        found.push({
          lineStart: match[1],
          lineEnd: match[2],
          northing,
          easting,
          distance: withDistance ? normalizeSurveyDistance(match[5]) : undefined,
          raw: match[0].trim(),
          northingToken: match[3],
          eastingToken: match[4],
          northingConfidence: match[confidenceIndex] ? Number(match[confidenceIndex]) : undefined,
          eastingConfidence: match[confidenceIndex + 1] ? Number(match[confidenceIndex + 1]) : undefined,
        });
      }
      return found;
    };

    // A table without a distance column yields more corners when the distance
    // group is dropped, so the richer reading only wins when it loses no rows.
    const withDistanceRows = scanRows(GRID_TABLE_ROW_REGEX, true);
    const withoutDistanceRows = scanRows(GRID_TABLE_ROW_NO_DISTANCE_REGEX, false);
    const rows = withoutDistanceRows.length > withDistanceRows.length
      ? withoutDistanceRows
      : withDistanceRows;

    const uniqueByLine = new Map<string, ZoneLessUtmRow>();
    for (const row of rows) {
      const key = `${row.lineStart}:${row.lineEnd}`;
      if (!uniqueByLine.has(key)) uniqueByLine.set(key, row);
    }
    if (uniqueByLine.size >= 2) batches.push(repairSurveyOcrRows(Array.from(uniqueByLine.values()), declaredArea));
  }

  const candidates = [
    ...batches,
    extractLineGridRows(text),
    extractColumnarLineGridRows(text),
    extractGenericGridRows(text),
  ].filter((rows) => rows.length >= 2);
  return candidates.sort((left, right) => gridBatchScore(right) - gridBatchScore(left))[0] ?? [];
}

/**
 * Coordinate-table column headings, in the wordings municipal and cadastral
 * documents actually print. Column order is not assumed: each entry declares
 * whether the northing or the easting column comes first.
 */
const GENERIC_GRID_HEADERS: readonly { pattern: string; order: "NE" | "EN" }[] = [
  { pattern: "(?:EASTING|E\\s*\\(?M\\)?|الشرقيات|الاحداثي\\s*الشرقي|الإحداثي\\s*الشرقي|شرقيات)", order: "EN" },
  { pattern: "(?:NORTHING|N\\s*\\(?M\\)?|الشماليات|الاحداثي\\s*الشمالي|الإحداثي\\s*الشمالي|شماليات)", order: "NE" },
];

const EASTING_HEADING = GENERIC_GRID_HEADERS[0].pattern;
const NORTHING_HEADING = GENERIC_GRID_HEADERS[1].pattern;

const GENERIC_GRID_ROW_REGEX =
  /(?:(?:P|PT|POINT|VERTEX|نقطة|النقطة)\s*)?(\d{1,4})[\s:,|\t]+([0-9][0-9.,]{4,12})[\s:,|\t]+([0-9][0-9.,]{4,12})(?:[\s:,|\t]+([0-9][0-9.,]{0,8}))?(?=[\s,|]|$)/g;

/**
 * Fallback survey-table reader for layouts the strict `NORTHING EASTING`
 * extractor does not cover: reversed columns, Arabic headings, and
 * `Point / Easting / Northing` rows.
 */
export function extractGenericGridRows(text: string): ZoneLessUtmRow[] {
  const headerPattern = new RegExp(
    `(?:${EASTING_HEADING}[\\s\\S]{0,40}?${NORTHING_HEADING}|${NORTHING_HEADING}[\\s\\S]{0,40}?${EASTING_HEADING})`,
    "gi",
  );

  const batches: ZoneLessUtmRow[][] = [];
  for (const header of Array.from(text.matchAll(headerPattern))) {
    const heading = header[0];
    const eastingFirst = new RegExp(`^${EASTING_HEADING}`, "i").test(heading.trim());
    const start = (header.index ?? 0) + heading.length;
    const segment = text.slice(start, start + 1_200);

    GENERIC_GRID_ROW_REGEX.lastIndex = 0;
    const rows: ZoneLessUtmRow[] = [];
    for (const match of segment.matchAll(GENERIC_GRID_ROW_REGEX)) {
      const firstToken = match[2];
      const secondToken = match[3];
      const northingToken = eastingFirst ? secondToken : firstToken;
      const eastingToken = eastingFirst ? firstToken : secondToken;
      const northing = normalizeGridCoordinate(northingToken, "northing");
      const easting = normalizeGridCoordinate(eastingToken, "easting");
      if (northing === null || easting === null) continue;
      rows.push({
        lineStart: match[1],
        lineEnd: match[1],
        northing,
        easting,
        distance: normalizeSurveyDistance(match[4]),
        raw: match[0].trim(),
        northingToken,
        eastingToken,
      });
    }

    const uniqueByLabel = new Map<string, ZoneLessUtmRow>();
    for (const row of rows) {
      if (!uniqueByLabel.has(row.lineStart)) uniqueByLabel.set(row.lineStart, row);
    }
    if (uniqueByLabel.size >= 2) batches.push(Array.from(uniqueByLabel.values()));
  }

  return batches.sort((left, right) => gridBatchScore(right) - gridBatchScore(left))[0] ?? [];
}

/**
 * Any recognised coordinate-column heading, Arabic or English. Used as
 * structural evidence that nearby decimal pairs really are coordinates.
 */
const COORDINATE_TABLE_HEADING_REGEX = new RegExp(
  [
    EASTING_HEADING,
    NORTHING_HEADING,
    "LATITUDE",
    "LONGITUDE",
    "COORDINATES?",
    "\\bVERTEX\\b",
    "الإحداثيات",
    "الاحداثيات",
    "إحداثيات",
    "احداثيات",
    "خط\\s*الطول",
    "خط\\s*العرض",
    "دائرة\\s*العرض",
    "رقم\\s*النقطة",
    "النقطة",
  ].join("|"),
  "i",
);

export function hasCoordinateTableHeading(text: string): boolean {
  return COORDINATE_TABLE_HEADING_REGEX.test(text);
}

const PARCEL_REGEX =
  /(?:\b(?:parcel|plot|lot|plan)\b(?:\s*(?:no\.?|number))?|قطعة|مخطط|المخطط|القطعة|رقم القطعة|رقم المخطط|صك)\s*[#:]?\s*([0-9-]{1,12})/gi;

const PARCEL_ARABIC_REGEX =
  /(?:قطعة|مخطط|صك)\s*(?:رقم\s*)?\s*[:#]?\s*([0-9]{1,10})/g;

const PLAN_PATTERN = /مخطط\s*(?:رقم\s*)?([0-9]{1,10})/g;

const POSTAL_CODE_REGEX = /\b\d{5}\b/g;

const GOVERNORATE_KEYWORDS: readonly string[] = [
  "مكة المكرمة",
  "الرياض",
  "جدة",
  "الدمام",
  "المدينة المنورة",
  "الطائف",
  "تبوك",
  "بريدة",
  "أبها",
  "خميس مشيط",
  "الجبيل",
  "ينبع",
  "القطيف",
  "الأحساء",
  "نجران",
  "عرعر",
  "سكاكا",
  "جازان",
  "الباحة",
  "حائل",
  "القريات",
  "رفحاء",
  "الخرج",
  "الدوادمي",
  "حفر الباطن",
];

const ARABIC_CITY_KEYWORDS: readonly string[] = [
  "الرياض",
  "جدة",
  "مكة",
  "المدينة",
  "الدمام",
  "الطائف",
  "أبها",
  "تبوك",
  "حائل",
  "جازان",
  "نجران",
];

const DISTRICT_MARKERS: readonly string[] = [
  "حي ",
  "الحي ",
  "حيّ ",
  "حي/",
];

const STREET_MARKERS: readonly string[] = [
  "شارع ",
  "طريق ",
  "street ",
  "road ",
];

export function parseUtmCoordinates(raw: string): { zone: number; easting: number; northing: number; northernHemisphere: boolean } | null {
  UTM_REGEX.lastIndex = 0;
  const match = UTM_REGEX.exec(raw);
  if (!match) return null;
  const zone = parseInt(match[1], 10);
  const hem = match[2].toUpperCase();
  const easting = parseFloat(match[3]);
  const northing = parseFloat(match[4]);
  const northernHemisphere = hem !== "S";
  return { zone, easting, northing, northernHemisphere };
}

/**
 * Numbers a structured reader has already identified as coordinates, keyed by
 * {@link normalizePairKey}. Supplying them lets the admission gate accept a
 * pair the surrounding prose says nothing about.
 */
export interface CoordinateEvidenceOptions {
  structurallyIdentifiedPairs?: readonly string[];
}

/** Whitespace- and separator-insensitive key for an unlabelled pair. */
export function normalizePairKey(raw: string): string {
  return raw.replace(/[\s,;]+/g, " ").trim();
}

export function extractCoordinateEvidence(
  text: string,
  options: CoordinateEvidenceOptions = {},
): CoordinateEvidence[] {
  const evidence: CoordinateEvidence[] = [];
  const structuralPairs = new Set((options.structurallyIdentifiedPairs ?? []).map(normalizePairKey));

  DECIMAL_REGEX.lastIndex = 0;
  UTM_REGEX.lastIndex = 0;

  // DMS tables carry one row per boundary corner, so adjacent N/S and E/W
  // components are paired instead of collapsing the whole document into a
  // single point.
  const dmsComponents = collectDmsComponents(text);
  for (let index = 0; index < dmsComponents.length - 1; index += 1) {
    const first = dmsComponents[index];
    const second = dmsComponents[index + 1];
    const firstIsLat = first.hemisphere === "N" || first.hemisphere === "S";
    const secondIsLat = second.hemisphere === "N" || second.hemisphere === "S";
    if (firstIsLat === secondIsLat) continue;
    if (second.end - first.start > 96) continue;

    const raw = text.slice(first.start, second.end);
    const point = parseDmsLatLon(raw);
    if (!point) continue;
    evidence.push({
      format: "dms",
      raw,
      point,
      crs: "wgs84",
      source: "labelled-dms",
    });
    index += 1;
  }

  LABELED_DECIMAL_PAIR_REGEX.lastIndex = 0;
  const labelledRows = Array.from(text.matchAll(LABELED_DECIMAL_PAIR_REGEX));
  if (labelledRows.length > 0) {
    for (const match of labelledRows) {
      const raw = match[0].trim();
      const point = parseHemisphereDecimalLatLon(raw);
      if (point) {
        evidence.push({
          format: "decimal",
          raw,
          point,
          crs: "wgs84",
          source: "labelled-coordinate",
        });
      }
    }
  } else {
    const hemisphereTokens = collectHemisphereDecimalTokens(text);
    for (let i = 0; i < hemisphereTokens.length - 1; i++) {
      const first = hemisphereTokens[i];
      const second = hemisphereTokens[i + 1];
      const firstIsLat = first.hemisphere === "N" || first.hemisphere === "S";
      const secondIsLat = second.hemisphere === "N" || second.hemisphere === "S";
      if (firstIsLat === secondIsLat || second.start - first.end > 48) continue;

      const raw = text.slice(first.start, second.end);
      const point = parseHemisphereDecimalLatLon(raw);
      if (point) {
        evidence.push({
          format: "decimal",
          raw,
          point,
          crs: "wgs84",
          source: "labelled-coordinate",
        });
        i += 1;
      }
    }
  }

  // Unlabelled pairs are gathered first, because the admission gate needs to
  // know how many of them the document holds: a boundary arrives as a set,
  // a side length arrives alone.
  const loosePairs: { raw: string; point: Point; start: number; end: number }[] = [];
  for (const match of text.matchAll(DECIMAL_REGEX)) {
    const point = parseDecimalLatLon(match[0]);
    if (!point) continue;
    const start = match.index ?? text.indexOf(match[0]);
    loosePairs.push({ raw: match[0], point, start, end: start + match[0].length });
  }

  for (const pair of loosePairs) {
    const windowStart = Math.max(0, pair.start - CONTEXT_WINDOW_CHARS);
    const verdict = admitLooseDecimalPair({
      window: contextWindow(text, pair.start, pair.end),
      pairOffset: pair.start - windowStart,
      siblingCount: loosePairs.length,
      structurallyIdentified: structuralPairs.has(normalizePairKey(pair.raw)),
    });
    evidence.push({
      format: "decimal",
      raw: pair.raw,
      point: pair.point,
      source: "unlabelled-decimal",
      admission: verdict.admission,
      admissionReason: verdict.reason,
      admissionEvidence: verdict.evidence,
    });
  }

  for (const match of text.matchAll(UTM_REGEX)) {
    const parsed = parseUtmCoordinates(match[0]);
    if (parsed) {
      evidence.push({
        format: "utm",
        raw: match[0],
        crs: "utm",
        source: "labelled-utm",
      });
    }
  }

  return evidence;
}

export function extractParcelEvidence(text: string): ParcelEvidence[] {
  const parcels: ParcelEvidence[] = [];

  for (const match of text.matchAll(PARCEL_REGEX)) {
    const value = match[1];
    if (/^\d/.test(value)) {
      const lower = match[0].toLowerCase();
      const kind = lower.includes("parcel") || /قطعة|القطعة/.test(match[0])
        ? "parcelId"
        : lower.includes("plan") || /مخطط|المخطط/.test(match[0])
          ? "planId"
          : lower.includes("plot") || lower.includes("lot")
            ? "plotId"
            : /صك/.test(match[0])
              ? "planId"
              : "parcelId";
      const entry: ParcelEvidence = { raw: match[0], source: "text" };
      if (kind === "parcelId") entry.parcelId = value;
      else if (kind === "planId") entry.planId = value;
      else entry.plotId = value;
      parcels.push(entry);
    }
  }

  if (parcels.length === 0) {
    for (const match of text.matchAll(PARCEL_ARABIC_REGEX)) {
      const value = match[1];
      const isPlan = /مخطط/.test(match[0]);
      const entry: ParcelEvidence = { raw: match[0], source: "text" };
      if (isPlan) entry.planId = value;
      else entry.parcelId = value;
      parcels.push(entry);
    }
  }

  const planMatches = Array.from(text.matchAll(PLAN_PATTERN));
  for (const match of planMatches) {
    const exists = parcels.some((p) => p.planId === match[1]);
    if (!exists) {
      parcels.push({ planId: match[1], raw: match[0], source: "text" });
    }
  }

  const unique = new Map<string, ParcelEvidence>();
  for (const p of parcels) {
    const key = `${p.parcelId ?? p.planId ?? p.plotId ?? ""}`;
    if (key && !unique.has(key)) unique.set(key, p);
  }

  return Array.from(unique.values());
}

export function extractAddressEvidence(text: string): AddressEvidence[] {
  const addresses: AddressEvidence[] = [];
  const lower = text.toLowerCase();

  for (const gov of GOVERNORATE_KEYWORDS) {
    if (lower.includes(gov.toLowerCase())) {
      addresses.push({ city: gov, raw: gov, source: "text" });
    }
  }

  for (const city of ARABIC_CITY_KEYWORDS) {
    if (lower.includes(city) && !addresses.some((a) => a.city === city)) {
      addresses.push({ city, raw: city, source: "text" });
    }
  }

  for (const marker of DISTRICT_MARKERS) {
    const idx = lower.indexOf(marker.toLowerCase());
    if (idx >= 0) {
      const after = text.slice(idx + marker.length);
      const match = /^([^\s،,;.\n]{2,40})/.exec(after);
      if (match) {
        addresses.push({ district: match[1], raw: `${marker}${match[1]}`, source: "text" });
      }
    }
  }

  for (const marker of STREET_MARKERS) {
    const idx = lower.indexOf(marker.toLowerCase());
    if (idx >= 0) {
      const after = text.slice(idx + marker.length);
      const match = /^([^،,;.\n]{2,40})/.exec(after);
      if (match) {
        addresses.push({ street: match[1].trim(), raw: `${marker}${match[1]}`, source: "text" });
      }
    }
  }

  const postal = Array.from(text.matchAll(POSTAL_CODE_REGEX));
  for (const match of postal) {
    addresses.push({ postalCode: match[0], raw: match[0], source: "text" });
  }

  const unique = new Map<string, AddressEvidence>();
  for (const a of addresses) {
    const key = `${a.city ?? ""}|${a.district ?? ""}|${a.street ?? ""}|${a.postalCode ?? ""}`;
    if (key && !unique.has(key)) unique.set(key, a);
  }

  return Array.from(unique.values());
}

export function extractGeoEvidence(
  text: string,
  options: CoordinateEvidenceOptions = {},
): GeoEvidence {
  return {
    explicitCoordinates: extractCoordinateEvidence(text, options),
    parcels: extractParcelEvidence(text),
    addresses: extractAddressEvidence(text),
  };
}
