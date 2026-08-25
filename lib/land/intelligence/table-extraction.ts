/**
 * Semantic reading of a reconstructed page layout.
 *
 * {@link reconstructLayout} answers "where is every piece of text"; this
 * module answers "which of those pieces are a coordinate table". It works from
 * column geometry and heading vocabulary only, so it reads a Gulf krooki, a
 * Turkish aplikasyon krokisi and an English coordinate schedule with the same
 * code path, and it never learns a document by name.
 *
 * Two rules matter more than the parsing:
 *
 *   1. Every row the table detector saw is accounted for. A row that cannot
 *      be used is rejected with a stated reason, never dropped.
 *   2. An axis assignment that the document does not support is carried as
 *      unconfident, so it can be shown for review but can never produce a
 *      confident parcel.
 */
import type { LayoutRow, LayoutTable } from "./layout";
import { classifyAxisToken, classifyColumn, type ColumnRole } from "./patterns/labels";
import {
  isPlausibleEasting,
  isPlausibleNorthing,
  resolveAxisAssignment,
  type AxisAssignment,
  type AxisColumn,
  type AxisContext,
  type AxisRole,
} from "./axis-resolution";
import { buildRowAccount, type RejectedRow, type RowAccount } from "./row-accounting";

export interface TableCoordinateRow {
  /** Position within the detected data rows of this table. */
  rowIndex: number;
  pointId?: string;
  fromPoint?: string;
  toPoint?: string;
  /** Easting when projected, longitude when geographic. */
  primary: number;
  /** Northing when projected, latitude when geographic. */
  secondary: number;
  distance?: number;
  raw: string;
}

export interface LayoutTableReading {
  page: number;
  kind: AxisAssignment["kind"];
  axis: AxisAssignment;
  /** Index of the row read as the heading, when there was one. */
  headerRowIndex?: number;
  headerText?: string;
  rows: TableCoordinateRow[];
  account: RowAccount;
  evidence: string[];
  warnings: string[];
}

/** Roles recognised per column, coordinate axes kept separate from the rest. */
interface ColumnAssessment {
  column: number;
  token: string;
  axisRole: AxisRole;
  role: ColumnRole;
}

/**
 * How many consecutive rows without a value in either coordinate column end
 * the table. Survey sheets interleave a drawing with the schedule, so a table
 * is allowed gaps; a page of prose below it is not part of it.
 */
const TABLE_GAP_ROWS = 6;
const MIN_ROWS_FOR_TABLE = 2;
const MAX_ROWS_SCANNED = 4_000;

const ARABIC_INDIC = /[٠-٩۰-۹]/g;

function toWesternDigits(value: string): string {
  return value.replace(ARABIC_INDIC, (digit) => {
    const code = digit.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/** Parses a single table cell as a number, or `null` when it is not one. */
export function parseNumericCell(raw: string): number | null {
  if (!raw) return null;
  const text = toWesternDigits(raw)
    .replace(/[٫]/g, ".")
    .replace(/[٬]/g, ",")
    .replace(/\s+/g, "")
    .trim();
  if (!text) return null;
  // A cell may be `567350.49`, `3,227`, `2 170 025.51` or `-1.5`. Anything
  // carrying a letter, a slash or a second sign is not a plain number.
  if (!/^[+-]?\d[\d,]*(?:\.\d+)?$/.test(text)) return null;
  const withoutGrouping = text.replace(/,(?=\d{3}\b)/g, "");
  if (/,/.test(withoutGrouping)) return null;
  const value = Number(withoutGrouping);
  return Number.isFinite(value) ? value : null;
}

function assessRow(row: LayoutRow): ColumnAssessment[] {
  return row.cells.map((cell) => ({
    column: cell.column,
    token: cell.text,
    axisRole: (classifyAxisToken(cell.text) ?? toAxisRole(classifyColumn(cell.text))) as AxisRole,
    role: classifyColumn(cell.text),
  }));
}

function toAxisRole(role: ColumnRole): AxisRole {
  switch (role) {
    case "EASTING":
    case "NORTHING":
    case "LATITUDE":
    case "LONGITUDE":
      return role;
    default:
      return "UNKNOWN";
  }
}

/** Merges a row with the one above it, per column, for headings that wrap. */
function mergeWithPrevious(rows: readonly LayoutRow[], index: number): LayoutRow {
  const current = rows[index];
  if (index === 0) return current;
  const previous = rows[index - 1];
  return {
    ...current,
    cells: current.cells.map((cell) => {
      const above = previous.cells.find((candidate) => candidate.column === cell.column);
      return above ? { ...cell, text: `${above.text} ${cell.text}`.trim() } : cell;
    }),
  };
}

function isAxisColumn(role: AxisRole): boolean {
  return role === "EASTING" || role === "NORTHING" || role === "LATITUDE"
    || role === "LONGITUDE" || role === "AXIS_X" || role === "AXIS_Y";
}

function pairable(a: AxisRole, b: AxisRole): boolean {
  const grid = new Set<AxisRole>(["EASTING", "NORTHING", "AXIS_X", "AXIS_Y"]);
  const geo = new Set<AxisRole>(["LATITUDE", "LONGITUDE"]);
  if (a === b) return false;
  if (grid.has(a) && grid.has(b)) return true;
  if (geo.has(a) && geo.has(b)) return true;
  // `X` beside `NORTHING` is a legitimate mixed heading.
  if (grid.has(a) && geo.has(b)) return false;
  return false;
}

function cellText(row: LayoutRow, column: number): string {
  return row.cells.find((cell) => cell.column === column)?.text ?? "";
}

/**
 * Where a heading sits horizontally, so its data cells can be found by
 * position as well as by column index.
 *
 * Column clustering is exact on a born-digital table and approximate on an
 * OCR one, where the same logical column drifts by a few points from row to
 * row and lands in neighbouring clusters. Matching on position recovers those
 * rows; matching on index remains the first choice because it is exact.
 */
interface ColumnTarget {
  column: number;
  centre: number;
}

function centreOfColumn(rows: readonly LayoutRow[], column: number): number | null {
  const centres: number[] = [];
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.column === column) centres.push(cell.x + cell.width / 2);
    }
  }
  if (centres.length === 0) return null;
  centres.sort((a, b) => a - b);
  return centres[Math.floor(centres.length / 2)];
}

/** Nearest-centre assignment: a cell belongs to the target it is closest to. */
function cellTextByPosition(row: LayoutRow, target: ColumnTarget, targets: readonly ColumnTarget[], tolerance: number): string {
  let best = "";
  let bestDistance = tolerance;
  for (const cell of row.cells) {
    const centre = cell.x + cell.width / 2;
    const distance = Math.abs(centre - target.centre);
    if (distance > bestDistance) continue;
    // Another heading owns this cell if it sits closer to that one.
    const owner = targets.reduce(
      (closest, candidate) => (Math.abs(centre - candidate.centre) < Math.abs(centre - closest.centre) ? candidate : closest),
      target,
    );
    if (owner !== target) continue;
    bestDistance = distance;
    best = cell.text;
  }
  return best;
}

interface DataScan {
  detectedRows: number;
  parsedRows: number;
  rows: TableCoordinateRow[];
  rejections: RejectedRow[];
  primaryValues: number[];
  secondaryValues: number[];
}

interface CellReader {
  (row: LayoutRow, column: number | undefined): string;
}

function scanDataRows(
  rows: readonly LayoutRow[],
  startIndex: number,
  primaryColumn: number,
  secondaryColumn: number,
  extras: { point?: number; from?: number; to?: number; line?: number; distance?: number },
  read: CellReader,
): DataScan {
  const scan: DataScan = {
    detectedRows: 0, parsedRows: 0, rows: [], rejections: [], primaryValues: [], secondaryValues: [],
  };
  let gap = 0;

  for (let index = startIndex; index < rows.length && index < startIndex + MAX_ROWS_SCANNED; index += 1) {
    const row = rows[index];
    const primaryRaw = read(row, primaryColumn);
    const secondaryRaw = read(row, secondaryColumn);
    const primary = parseNumericCell(primaryRaw);
    const secondary = parseNumericCell(secondaryRaw);

    if (primary === null && secondary === null) {
      if (scan.detectedRows > 0) {
        gap += 1;
        if (gap >= TABLE_GAP_ROWS) break;
      }
      continue;
    }
    gap = 0;

    const detectedIndex = scan.detectedRows;
    scan.detectedRows += 1;
    const raw = row.text;

    if (primary === null || secondary === null) {
      scan.rejections.push({
        rowIndex: detectedIndex,
        reason: "MISSING_COORDINATE_PAIR",
        detail: primary === null
          ? `no numeric value in the first coordinate column (read "${primaryRaw}")`
          : `no numeric value in the second coordinate column (read "${secondaryRaw}")`,
        raw,
      });
      continue;
    }
    scan.parsedRows += 1;

    const lineToken = read(row, extras.line);
    const dashed = /^\s*([A-Za-z0-9]+)\s*[-–—]\s*([A-Za-z0-9]+)\s*$/.exec(toWesternDigits(lineToken));
    const fromPoint = extras.from !== undefined ? read(row, extras.from) || undefined : dashed?.[1];
    const toPoint = extras.to !== undefined ? read(row, extras.to) || undefined : dashed?.[2];
    const pointId = extras.point !== undefined ? read(row, extras.point) || undefined : undefined;
    const distance = extras.distance !== undefined
      ? parseNumericCell(read(row, extras.distance)) ?? undefined
      : undefined;

    scan.rows.push({
      rowIndex: detectedIndex,
      pointId: pointId ?? (dashed ? undefined : lineToken || undefined),
      fromPoint,
      toPoint,
      primary,
      secondary,
      distance,
      raw,
    });
    scan.primaryValues.push(primary);
    scan.secondaryValues.push(secondary);
  }

  return scan;
}

function buildReading(
  page: number,
  rows: readonly LayoutRow[],
  headerRowIndex: number | undefined,
  headerText: string | undefined,
  first: { column: number; token: string; role: AxisRole },
  second: { column: number; token: string; role: AxisRole },
  extras: { point?: number; from?: number; to?: number; line?: number; distance?: number },
  context: AxisContext,
): LayoutTableReading | null {
  const startIndex = headerRowIndex === undefined ? 0 : headerRowIndex + 1;
  const byIndex: CellReader = (row, column) => (column === undefined ? "" : cellText(row, column));

  // Positional matching, used when column clustering split one logical column
  // across neighbours — routine on OCR output, impossible on clean PDF text.
  const targetColumns = [first.column, second.column, ...Object.values(extras)]
    .filter((column): column is number => column !== undefined);
  const targets: ColumnTarget[] = [];
  for (const column of new Set(targetColumns)) {
    const centre = centreOfColumn(rows, column);
    if (centre !== null) targets.push({ column, centre });
  }
  const sortedCentres = targets.map((target) => target.centre).sort((a, b) => a - b);
  let pitch = Number.POSITIVE_INFINITY;
  for (let index = 1; index < sortedCentres.length; index += 1) {
    pitch = Math.min(pitch, sortedCentres[index] - sortedCentres[index - 1]);
  }
  const tolerance = Number.isFinite(pitch) ? Math.min(80, Math.max(12, pitch * 0.75)) : 40;
  const byPosition: CellReader = (row, column) => {
    if (column === undefined) return "";
    const target = targets.find((candidate) => candidate.column === column);
    return target ? cellTextByPosition(row, target, targets, tolerance) : cellText(row, column);
  };

  const indexProbe = scanDataRows(rows, startIndex, first.column, second.column, extras, byIndex);
  const positionProbe = targets.length >= 2
    ? scanDataRows(rows, startIndex, first.column, second.column, extras, byPosition)
    : indexProbe;
  const probe = positionProbe.rows.length > indexProbe.rows.length ? positionProbe : indexProbe;
  if (probe.rows.length < MIN_ROWS_FOR_TABLE) return null;

  const axis = resolveAxisAssignment(
    { columnIndex: first.column, headerToken: first.token, headerRole: first.role, values: probe.primaryValues },
    { columnIndex: second.column, headerToken: second.token, headerRole: second.role, values: probe.secondaryValues },
    { ...context, spatiallyAdjacent: Math.abs(first.column - second.column) <= 2 },
  );
  if (!axis) return null;

  // The scan read the columns in page order; the axis resolver may say the
  // document means them the other way round.
  const swapped = axis.primaryColumn !== first.column;
  const oriented = probe.rows.map((row) => (
    swapped ? { ...row, primary: row.secondary, secondary: row.primary } : row
  ));

  // Now that the axes are known, each row can be checked against the envelope
  // its axis permits. This is where an OCR-merged decimal point is caught:
  // `433953049` is not a northing, and the row says so instead of quietly
  // dragging a corner four thousand kilometres.
  const finalRows: TableCoordinateRow[] = [];
  const rangeRejections: RejectedRow[] = [];
  for (const row of oriented) {
    const primaryOk = axis.kind === "PROJECTED"
      ? isPlausibleEasting(row.primary)
      : Math.abs(row.primary) <= 180;
    const secondaryOk = axis.kind === "PROJECTED"
      ? isPlausibleNorthing(row.secondary)
      : Math.abs(row.secondary) <= 90;
    if (primaryOk && secondaryOk) {
      finalRows.push(row);
      continue;
    }
    rangeRejections.push({
      rowIndex: row.rowIndex,
      pointId: row.pointId,
      reason: "OUT_OF_RANGE",
      detail: `${primaryOk ? "" : `${row.primary} is not a plausible ${axis.kind === "PROJECTED" ? "easting" : "longitude"}; `}`
        + `${secondaryOk ? "" : `${row.secondary} is not a plausible ${axis.kind === "PROJECTED" ? "northing" : "latitude"}`}`,
      raw: row.raw,
    });
  }
  if (finalRows.length < MIN_ROWS_FOR_TABLE) return null;

  const warnings: string[] = [];
  if (!axis.confident) {
    warnings.push(
      `the coordinate axes of this table could not be established from the document (${
        axis.conflicts.join("; ") || "no supporting evidence"
      })`,
    );
  }

  const account = buildRowAccount({
    detectedRows: probe.detectedRows,
    parsedRows: probe.parsedRows,
    acceptedRows: finalRows.length,
    rejections: [...probe.rejections, ...rangeRejections],
  });

  return {
    page,
    kind: axis.kind,
    axis,
    headerRowIndex,
    headerText,
    rows: finalRows,
    account,
    evidence: axis.evidence,
    warnings,
  };
}

/**
 * Reads every coordinate table a reconstructed page holds.
 *
 * Heading-led reading is tried first, across every row that could be a
 * heading, and the reading that accounts for the most rows wins. When no
 * heading is recognised — a scan whose header did not survive OCR, a sheet
 * that prints the numbers bare — the columns are inferred from their own
 * values instead, and the result is reported as unconfident.
 */
export function extractTablesFromLayout(
  tables: readonly LayoutTable[],
  context: AxisContext = {},
): LayoutTableReading[] {
  const readings: LayoutTableReading[] = [];

  for (const table of tables) {
    const rows = table.rows;
    if (rows.length === 0) continue;

    let best: LayoutTableReading | null = null;
    const consider = (reading: LayoutTableReading | null) => {
      if (!reading) return;
      if (!best || readingRank(reading) > readingRank(best)) best = reading;
    };

    for (let index = 0; index < rows.length; index += 1) {
      for (const candidateRow of [rows[index], mergeWithPrevious(rows, index)]) {
        const assessment = assessRow(candidateRow);
        const axes = assessment.filter((cell) => isAxisColumn(cell.axisRole));
        if (axes.length === 0) continue;
        const extras = {
          point: assessment.find((cell) => cell.role === "POINT")?.column,
          from: assessment.find((cell) => cell.role === "FROM")?.column,
          to: assessment.find((cell) => cell.role === "TO")?.column,
          line: assessment.find((cell) => cell.role === "LINE")?.column,
          distance: assessment.find((cell) => cell.role === "DISTANCE")?.column,
        };

        for (let a = 0; a < axes.length - 1; a += 1) {
          for (let b = a + 1; b < axes.length; b += 1) {
            if (!pairable(axes[a].axisRole, axes[b].axisRole)) continue;
            consider(buildReading(
              table.page, rows, index, candidateRow.text,
              { column: axes[a].column, token: axes[a].token, role: axes[a].axisRole },
              { column: axes[b].column, token: axes[b].token, role: axes[b].axisRole },
              extras, context,
            ));
          }
        }

        // One axis named and the other not. This is what a damaged scan looks
        // like: `Y` survived OCR and `X` came back as something else. The
        // named column anchors the pair; the axis resolver still has to say
        // which way round they go, and it can refuse.
        if (best === null) {
          for (const axis of axes) {
            for (const partner of assessment) {
              if (partner.column === axis.column) continue;
              if (isAxisColumn(partner.axisRole)) continue;
              if (partner.role !== "UNKNOWN" && partner.role !== "POINT") continue;
              consider(buildReading(
                table.page, rows, index, candidateRow.text,
                { column: axis.column, token: axis.token, role: axis.axisRole },
                { column: partner.column, token: partner.token, role: "UNKNOWN" },
                { ...extras, point: extras.point === partner.column ? undefined : extras.point },
                context,
              ));
            }
          }
        }
      }
    }

    if (!best) best = inferHeaderlessTable(table, context);
    if (best) readings.push(best);
  }

  return readings;
}

/**
 * Last resort: no heading was recognised, so the columns are judged by their
 * own values. Deliberately conservative — three rows minimum, both columns
 * numeric throughout — and always unconfident, because nothing in the
 * document said what these numbers are.
 */
function inferHeaderlessTable(table: LayoutTable, context: AxisContext): LayoutTableReading | null {
  const columns = [...new Set(table.rows.flatMap((row) => row.cells.map((cell) => cell.column)))].sort((a, b) => a - b);
  let best: LayoutTableReading | null = null;

  for (let a = 0; a < columns.length - 1; a += 1) {
    for (let b = a + 1; b < columns.length; b += 1) {
      const reading = buildReading(
        table.page, table.rows, undefined, undefined,
        { column: columns[a], token: "", role: "UNKNOWN" },
        { column: columns[b], token: "", role: "UNKNOWN" },
        {}, context,
      );
      if (!reading || reading.rows.length < 3) continue;
      if (!best || reading.rows.length > best.rows.length) {
        best = { ...reading, warnings: [...reading.warnings, "no column heading was recognised; the columns were read from their values alone"] };
      }
    }
  }

  return best;
}

/**
 * How readings of the same page compete.
 *
 * A reading whose axes the document actually settled outranks a longer one
 * that had to guess, and a reading whose two headings were both recognised
 * outranks one that matched only a single heading. Row count decides the rest,
 * because a reader that saw more of the table lost less of it.
 */
function readingRank(reading: LayoutTableReading): number {
  const namedPair = reading.headerText !== undefined ? 1 : 0;
  return (reading.axis.confident ? 100_000 : 0) + namedPair * 10_000 + reading.rows.length;
}

/** Column-index helper shared with the tests. */
export function columnsOf(table: LayoutTable): number[] {
  return [...new Set(table.rows.flatMap((row) => row.cells.map((cell) => cell.column)))].sort((a, b) => a - b);
}

export type { AxisAssignment, AxisColumn, AxisContext, AxisRole };
