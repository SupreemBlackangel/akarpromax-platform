/**
 * Survey coordinate-table extraction.
 *
 * A survey sheet does not list loose numbers: it lists a parcel. A row such as
 *
 *     LINE  EASTING     NORTHING     DIST
 *     1  2  565150.50   2550415.28   30.00
 *
 * says that the edge from corner 1 to corner 2 starts at that easting and
 * northing and runs 30.00 m. Reading it as four unrelated numbers throws away
 * the topology, the sequence, and the distance check.
 *
 * This module reads the whole structure: the heading decides which column is
 * which, the `from → to` pair gives the boundary sequence explicitly, and the
 * closing `4 → 1` is understood as the ring closing rather than a fifth corner.
 *
 * Every pattern is bounded and free of nested quantifiers, so none can
 * backtrack catastrophically on a hostile input.
 */
import {
  normalizeArabicDigits,
  normalizeArabicSeparators,
  normalizeNumericToken,
} from "@/lib/land/documents/numerals";
import {
  classifyHeadingLine,
  firstCoordinateColumn,
  type ColumnRole,
} from "./labels";

/** Guard rails, so a hostile or broken document cannot exhaust the process. */
export const MAX_TABLE_ROWS = 500;
export const MAX_TABLES = 12;
export const MAX_SCAN_CHARS = 400_000;

/** Plausible envelopes, used to tell a coordinate from an ordinary number. */
const EASTING_RANGE: readonly [number, number] = [100_000, 900_000];
const NORTHING_RANGE: readonly [number, number] = [0, 10_000_000];
const LATITUDE_RANGE: readonly [number, number] = [-90, 90];
const LONGITUDE_RANGE: readonly [number, number] = [-180, 180];
const DISTANCE_RANGE: readonly [number, number] = [0.01, 100_000];

export type TableTopology = "LINE" | "POINT" | "ORDERED";

export interface SurveyTableRow {
  /** Corner the row's coordinates belong to. */
  fromPoint: string;
  /** Corner the row's edge runs to, when the table states a topology. */
  toPoint?: string;
  easting?: number;
  northing?: number;
  latitude?: number;
  longitude?: number;
  /** Edge length as printed. */
  distance?: number;
  bearing?: number;
  /** Line index within the document text. */
  lineNumber: number;
  raw: string;
}

export interface SurveyTable {
  /** How the row order was established. */
  topology: TableTopology;
  /** Column roles, in the order the heading lists them. */
  columns: ColumnRole[];
  headingRaw: string;
  /** Character offset of the heading in the source text. */
  index: number;
  rows: SurveyTableRow[];
  /** Corner labels in boundary order, e.g. `["1","2","3","4"]`. */
  sequence: string[];
  /** True when the edges return to the first corner. */
  closed: boolean;
  /** Edge lengths as printed, in boundary order. */
  distances: { from: string; to: string; meters: number }[];
  /** Relative strength of this table as coordinate evidence. */
  score: number;
  warnings: string[];
}

/** A numeric token: digits with optional separators and sign. */
const NUMBER_TOKEN = /-?[\d٠-٩][\d٠-٩.,٫٬]{0,18}/g;

/**
 * A `from → to` corner pair at the start of a row: `1 2`, `1-2`, `1 → 2`,
 * `1 TO 2`, `1/2`.
 */
const EDGE_PREFIX =
  /^\s{0,8}(?:(?:P|PT|POINT|نقطة|النقطة)\s?)?(\d{1,3})\s{0,4}(?:-|–|—|→|->|=>|\/|\||TO|الى|إلى)?\s{0,4}(?:(?:P|PT|POINT|نقطة|النقطة)\s?)?(\d{1,3})(?=[\s|,])/i;

/** A single corner identifier at the start of a row: `1`, `P1`, `نقطة 1`. */
const POINT_PREFIX = /^\s{0,8}(?:(?:P|PT|POINT|VERTEX|STATION|نقطة|النقطة)\s?)?(\d{1,3})(?=[\s|,])/i;

/**
 * A whole coordinate row: a corner number, optionally the corner the edge runs
 * to, two values large enough to be a grid coordinate, and an optional
 * distance. The row is matched in full rather than by its start, so scanning
 * steps over each row instead of also matching the second corner number inside
 * it as the start of another row.
 */
const FULL_ROW =
  /(?<![\d.,])\d{1,3}(?:\s{1,6}\d{1,3})?\s{1,8}\d{3,8}[.,]\d{1,4}\s{1,8}\d{3,8}[.,]\d{1,4}(?:\s{1,8}\d{1,8}(?:[.,]\d{1,4})?(?!\s{1,8}\d{3,8}[.,]|\s{1,6}\d{1,3}\s{1,8}\d{3,8}[.,]))?/g;

/**
 * Restores row boundaries in text that lost them.
 *
 * A PDF text layer is extracted item by item and joined with spaces, so a whole
 * survey sheet can arrive as a single line. Rows are put back by finding each
 * corner-number-plus-coordinates run — a shape ordinary prose does not have —
 * and giving it a line of its own. Text that already has line breaks is
 * returned untouched.
 */
export function reconstructSurveyLines(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const populated = lines.filter((line) => line.trim().length > 0);
  const alreadyLineBased = populated.length >= 3 && populated.every((line) => line.length < 400);
  if (alreadyLineBased) return lines;

  const segments: string[] = [];
  let cursor = 0;
  FULL_ROW.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FULL_ROW.exec(text)) !== null) {
    if (match.index > cursor) segments.push(text.slice(cursor, match.index));
    segments.push(match[0]);
    cursor = match.index + match[0].length;
  }
  if (segments.length === 0) return lines;
  if (cursor < text.length) segments.push(text.slice(cursor));
  return segments;
}

function inRange(value: number, [min, max]: readonly [number, number]): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function numericTokens(line: string): number[] {
  NUMBER_TOKEN.lastIndex = 0;
  const values: number[] = [];
  for (const match of line.matchAll(NUMBER_TOKEN)) {
    const value = normalizeNumericToken(match[0]);
    if (value !== null) values.push(value);
  }
  return values;
}

/**
 * Assigns a row's numbers to the columns the heading declared.
 *
 * The data columns start at the first coordinate column: everything before it
 * is an identifier the row prefix already consumed. That is what makes
 * `POINT NORTHING EASTING`, `LINE EASTING NORTHING DIST`, and a heading with an
 * unrecognised leading token all read correctly without a per-country rule.
 */
function assignByColumns(
  values: readonly number[],
  columns: readonly ColumnRole[],
  consumedLeadingIdentifiers: number,
): Partial<SurveyTableRow> {
  const assignment: Partial<SurveyTableRow> = {};
  const firstCoordinate = firstCoordinateColumn(columns);
  if (firstCoordinate < 0) return assignment;
  const dataColumns = columns.slice(firstCoordinate);
  const dataValues = values.slice(consumedLeadingIdentifiers);

  for (let index = 0; index < dataColumns.length && index < dataValues.length; index += 1) {
    const value = dataValues[index];
    switch (dataColumns[index]) {
      case "EASTING":
        if (inRange(value, EASTING_RANGE)) assignment.easting = value;
        break;
      case "NORTHING":
        if (inRange(value, NORTHING_RANGE)) assignment.northing = value;
        break;
      case "LATITUDE":
        if (inRange(value, LATITUDE_RANGE)) assignment.latitude = value;
        break;
      case "LONGITUDE":
        if (inRange(value, LONGITUDE_RANGE)) assignment.longitude = value;
        break;
      case "DISTANCE":
        if (inRange(value, DISTANCE_RANGE)) assignment.distance = value;
        break;
      case "BEARING":
        if (value >= 0 && value <= 360) assignment.bearing = value;
        break;
      default:
        break;
    }
  }

  return assignment;
}

function parseRow(
  line: string,
  rawLine: string,
  lineNumber: number,
  columns: readonly ColumnRole[],
  expectEdge: boolean,
): SurveyTableRow | null {
  const values = numericTokens(line);
  if (values.length < 2) return null;

  let fromPoint: string | undefined;
  let toPoint: string | undefined;
  let consumed = 0;

  if (expectEdge) {
    const edge = EDGE_PREFIX.exec(line);
    if (edge) {
      fromPoint = edge[1];
      toPoint = edge[2];
      consumed = 2;
    }
  }
  if (!fromPoint) {
    const point = POINT_PREFIX.exec(line);
    if (point) {
      fromPoint = point[1];
      consumed = 1;
    }
  }
  if (!fromPoint) return null;

  const assignment = assignByColumns(values, columns, consumed);
  const hasCoordinatePair =
    (assignment.easting !== undefined && assignment.northing !== undefined)
    || (assignment.latitude !== undefined && assignment.longitude !== undefined);
  if (!hasCoordinatePair) return null;

  return {
    fromPoint,
    toPoint,
    ...assignment,
    lineNumber,
    raw: rawLine.trim(),
  };
}

/**
 * Builds the boundary sequence from the rows.
 *
 * Explicit edge topology is the strongest evidence there is: when every row
 * says which corner it runs to, the sequence is read straight off the document
 * and no geometric inference is involved. Without it the table's own row order
 * is used, which is still the document's order.
 */
function buildSequence(rows: readonly SurveyTableRow[]): {
  sequence: string[];
  closed: boolean;
  topology: TableTopology;
  warnings: string[];
} {
  const warnings: string[] = [];
  const hasEdges = rows.length >= 2 && rows.every((row) => row.toPoint !== undefined);

  if (hasEdges) {
    const chained = rows.every((row, index) => {
      const next = rows[(index + 1) % rows.length];
      return row.toPoint === next.fromPoint;
    });
    const sequence = rows.map((row) => row.fromPoint);
    const closed = rows[rows.length - 1].toPoint === rows[0].fromPoint;
    if (!chained) {
      warnings.push("edge topology does not chain; the row order was kept as documented");
    }
    return {
      sequence,
      closed,
      topology: chained ? "LINE" : "ORDERED",
      warnings,
    };
  }

  const numbered = rows.every((row) => /^\d{1,3}$/.test(row.fromPoint));
  return {
    sequence: rows.map((row) => row.fromPoint),
    closed: false,
    topology: numbered ? "POINT" : "ORDERED",
    warnings,
  };
}

function scoreTable(table: Omit<SurveyTable, "score">): number {
  let score = 40;
  if (table.topology === "LINE") score += 30;
  else if (table.topology === "POINT") score += 15;
  if (table.closed) score += 10;
  if (table.distances.length === table.rows.length && table.rows.length > 0) score += 10;
  if (table.columns.includes("EASTING") && table.columns.includes("NORTHING")) score += 10;
  if (table.columns.includes("LATITUDE") && table.columns.includes("LONGITUDE")) score += 10;
  score += Math.min(10, table.rows.length);
  score -= table.warnings.length * 5;
  return Math.max(0, score);
}

/**
 * Reads every coordinate table in a document.
 *
 * Tables are found by their heading, then rows are taken from the lines that
 * follow until the shape stops matching. Several tables in one document stay
 * separate — a reference-point list is never merged into a parcel boundary.
 */
export function extractSurveyTables(text: string): SurveyTable[] {
  if (!text || text.length > MAX_SCAN_CHARS) return [];

  const rawLines = reconstructSurveyLines(text);
  // Parsing runs on digits folded to a Latin form; the untouched line is what
  // every row keeps as its evidence.
  const lines = rawLines.map((line) => normalizeArabicSeparators(normalizeArabicDigits(line)));
  // Offset of each line's first character, so a table can be tied to the CRS
  // declaration that precedes it.
  const lineOffsets: number[] = [];
  let cursor = 0;
  for (const line of rawLines) {
    const trimmed = line.trim();
    const found = trimmed ? text.indexOf(trimmed, cursor) : -1;
    const offset = found >= 0 ? found : cursor;
    lineOffsets.push(offset);
    cursor = offset + Math.max(1, trimmed.length);
  }

  const tables: SurveyTable[] = [];

  for (let index = 0; index < lines.length && tables.length < MAX_TABLES; index += 1) {
    const heading = classifyHeadingLine(lines[index]);
    if (!heading) continue;

    const expectEdge = heading.roles.includes("LINE")
      || (heading.roles.includes("FROM") && heading.roles.includes("TO"));

    const rows: SurveyTableRow[] = [];
    let misses = 0;
    for (let cursorLine = index + 1; cursorLine < lines.length && rows.length < MAX_TABLE_ROWS; cursorLine += 1) {
      const line = lines[cursorLine];
      if (!line.trim()) {
        // A blank line inside a table is tolerated once; two end it.
        misses += 1;
        if (misses >= 2 && rows.length > 0) break;
        continue;
      }
      const row = parseRow(line, rawLines[cursorLine], cursorLine, heading.roles, expectEdge);
      if (row) {
        rows.push(row);
        misses = 0;
        continue;
      }
      misses += 1;
      if (rows.length > 0 && misses >= 2) break;
      if (rows.length === 0 && misses >= 4) break;
    }

    if (rows.length < 2) continue;

    const { sequence, closed, topology, warnings } = buildSequence(rows);
    const distances = rows
      .filter((row) => row.distance !== undefined && row.toPoint !== undefined)
      .map((row) => ({ from: row.fromPoint, to: row.toPoint as string, meters: row.distance as number }));

    const table: Omit<SurveyTable, "score"> = {
      topology,
      columns: heading.roles,
      headingRaw: rawLines[index].trim(),
      index: lineOffsets[index],
      rows,
      sequence,
      closed,
      distances,
      warnings,
    };
    tables.push({ ...table, score: scoreTable(table) });
    index = rows[rows.length - 1].lineNumber;
  }

  return tables;
}

/**
 * The table most likely to be the parcel boundary: the highest-scoring one.
 * The others stay available so the caller can offer them as alternatives
 * rather than merging them.
 */
export function primarySurveyTable(tables: readonly SurveyTable[]): SurveyTable | undefined {
  if (tables.length === 0) return undefined;
  return [...tables].sort((left, right) => right.score - left.score)[0];
}
