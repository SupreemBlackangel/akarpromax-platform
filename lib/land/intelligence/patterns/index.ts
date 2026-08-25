/**
 * Universal coordinate pattern engine.
 *
 * One place that turns a survey document's text into parcel candidates:
 * tables are located by their headings, tied to the CRS declaration that
 * governs them, converted through the shared coordinate engine, and returned
 * with the sequence the document itself states.
 *
 * Patterns only propose. Nothing here decides that a candidate is real — the
 * resolver's safety rules still make that call, and a candidate with no
 * usable CRS is returned unconverted rather than guessed at.
 */
import type { Point } from "@/lib/geo/contracts";
import { isValidUtmZone, utmEpsgCode, utmToWgs84Result, type Hemisphere } from "@/lib/geo/utm";
import type { AreaStatement } from "./area-patterns";
import { registeredArea } from "./area-patterns";
import { crsDeclarationFor, findCrsDeclarations, type CrsDeclaration } from "./crs-patterns";
import {
  extractSurveyTables,
  type SurveyTable,
  type SurveyTableRow,
} from "./survey-table-patterns";

export * from "./labels";
export * from "./crs-patterns";
export * from "./area-patterns";
export * from "./survey-table-patterns";

/**
 * How the corner order was established, strongest first. Geometry is never
 * used to order corners when the document states the connectivity itself.
 */
export type SequenceEvidence =
  | "EXPLICIT_LINE_TOPOLOGY"
  | "EXPLICIT_POINT_NUMBERING"
  | "ORDERED_COORDINATE_TABLE";

export interface ParcelCandidateVertex {
  /** Corner identifier as the document writes it. */
  pointNumber: string;
  label: string;
  /** Grid values as documented, when the table is a UTM grid. */
  easting?: number;
  northing?: number;
  /** Geographic values as documented, when the table is lat/lon. */
  latitude?: number;
  longitude?: number;
  /** Resolved WGS84 position, absent when no CRS could be established. */
  point?: Point;
  lineNumber: number;
  raw: string;
}

export interface ParcelCandidate {
  id: string;
  /** Where the corner order came from. */
  sequenceEvidence: SequenceEvidence;
  vertices: ParcelCandidateVertex[];
  /** True when the document's edges return to the first corner. */
  closed: boolean;
  /** Edge lengths as printed. */
  documentedDistances: { from: string; to: string; meters: number }[];
  crs?: {
    zone?: number;
    hemisphere?: Hemisphere;
    epsg?: number;
    kind: "utm" | "wgs84";
    declaration?: CrsDeclaration;
  };
  /** True when the table is a UTM grid but no zone could be established. */
  crsSelectionRequired: boolean;
  statedArea?: AreaStatement;
  /** Relative strength of this candidate. */
  score: number;
  table: SurveyTable;
  warnings: string[];
}

function sequenceEvidenceFor(table: SurveyTable): SequenceEvidence {
  if (table.topology === "LINE") return "EXPLICIT_LINE_TOPOLOGY";
  if (table.topology === "POINT") return "EXPLICIT_POINT_NUMBERING";
  return "ORDERED_COORDINATE_TABLE";
}

function isGridTable(rows: readonly SurveyTableRow[]): boolean {
  return rows.every((row) => row.easting !== undefined && row.northing !== undefined);
}

function isGeographicTable(rows: readonly SurveyTableRow[]): boolean {
  return rows.every((row) => row.latitude !== undefined && row.longitude !== undefined);
}

/**
 * Turns one table into a parcel candidate.
 *
 * A grid table needs a zone and a hemisphere before its rows mean anything on
 * a map. If the document does not supply them, the candidate is returned with
 * `crsSelectionRequired` set and no converted points — never with a guessed
 * zone.
 */
function buildCandidate(
  table: SurveyTable,
  declarations: readonly CrsDeclaration[],
  statedArea: AreaStatement | undefined,
  index: number,
  override?: { zone?: number; hemisphere?: Hemisphere },
): ParcelCandidate {
  const warnings = [...table.warnings];
  const grid = isGridTable(table.rows);
  const geographic = isGeographicTable(table.rows);

  const declaration = crsDeclarationFor(declarations, table.index);
  const zone = override?.zone ?? declaration?.zone;
  const hemisphere = override?.hemisphere ?? declaration?.hemisphere;
  const zoneResolved = isValidUtmZone(zone) && (hemisphere === "N" || hemisphere === "S");

  const vertices: ParcelCandidateVertex[] = table.rows.map((row, rowIndex) => {
    const vertex: ParcelCandidateVertex = {
      pointNumber: row.fromPoint,
      label: `P${rowIndex + 1}`,
      easting: row.easting,
      northing: row.northing,
      latitude: row.latitude,
      longitude: row.longitude,
      lineNumber: row.lineNumber,
      raw: row.raw,
    };

    if (geographic && row.latitude !== undefined && row.longitude !== undefined) {
      vertex.point = { lat: row.latitude, lon: row.longitude };
    } else if (grid && zoneResolved && row.easting !== undefined && row.northing !== undefined) {
      const converted = utmToWgs84Result(row.easting, row.northing, zone as number, hemisphere as Hemisphere);
      if (converted.ok) vertex.point = converted.value;
    }
    return vertex;
  });

  const crsSelectionRequired = grid && !zoneResolved;
  if (crsSelectionRequired) {
    warnings.push("survey grid table found; select a UTM zone and hemisphere before conversion");
  }

  let score = table.score;
  if (zoneResolved) score += 15;
  if (geographic) score += 10;
  if (statedArea) score += 5;
  if (crsSelectionRequired) score -= 20;

  return {
    id: `parcel-${index + 1}`,
    sequenceEvidence: sequenceEvidenceFor(table),
    vertices,
    closed: table.closed,
    documentedDistances: table.distances,
    crs: geographic
      ? { kind: "wgs84" }
      : zoneResolved
        ? {
            kind: "utm",
            zone,
            hemisphere,
            epsg: utmEpsgCode(zone as number, hemisphere as Hemisphere),
            declaration,
          }
        : { kind: "utm", declaration },
    crsSelectionRequired,
    statedArea,
    score: Math.max(0, score),
    table,
    warnings,
  };
}

export interface ExtractParcelCandidatesOptions {
  /** A zone the user chose, applied to grid tables the document leaves open. */
  utmZone?: number;
  utmHemisphere?: Hemisphere;
}

/**
 * Every parcel candidate in a document, strongest first.
 *
 * Separate tables stay separate: a reference-station list is never merged into
 * a parcel boundary.
 */
export function extractParcelCandidates(
  text: string,
  options: ExtractParcelCandidatesOptions = {},
): ParcelCandidate[] {
  const tables = extractSurveyTables(text);
  if (tables.length === 0) return [];

  const declarations = findCrsDeclarations(text);
  const area = registeredArea(text);

  return tables
    .map((table, index) =>
      buildCandidate(table, declarations, area, index, {
        zone: options.utmZone,
        hemisphere: options.utmHemisphere,
      }),
    )
    .sort((left, right) => right.score - left.score);
}
