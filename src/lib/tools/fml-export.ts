/**
 * The parcel as a file: DXF for CAD, KML for a map, CSV for a spreadsheet.
 *
 * The clipboard (fml-clipboard.ts) covers pasting into an open program. This
 * covers the other half of a surveyor's day — handing the parcel to somebody
 * else, or opening it in a program that wants a file. Same rules as the
 * clipboard: the document's own values, Latin digits, no renumbering.
 */
import { DXF_COLOR, DxfBuilder, dxfNumber } from "./dxf";
import { formatPoints, normalizeLabel, type CopyRow } from "./fml-clipboard";

export type ExportFormat = "dxf" | "kml" | "csv";

export interface ParcelExport {
  /** The rows as displayed, projected metres. */
  rows: readonly CopyRow[];
  /** Computed or documented area, in square metres, when the tool has one. */
  areaSquareMeters?: number;
  /** UTM zone and hemisphere of `rows`, for the file name and the KML note. */
  zone?: number;
  hemisphere?: "N" | "S";
  /** Parcel / plan / plot number, for the file name and the KML title. */
  name?: string;
}

/** `C` closes a ring, so a repeated first point would be a zero-length edge. */
function ringVertices(rows: readonly CopyRow[]): CopyRow[] {
  if (rows.length < 3) return [...rows];
  const first = rows[0];
  const last = rows[rows.length - 1];
  const closes = first.easting === last.easting && first.northing === last.northing;
  return closes ? rows.slice(0, -1) : [...rows];
}

/** The polygon's centre of area — where a reader expects the area label. */
function centroid(vertices: readonly CopyRow[]): { x: number; y: number } {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const cross = a.easting * b.northing - b.easting * a.northing;
    twiceArea += cross;
    x += (a.easting + b.easting) * cross;
    y += (a.northing + b.northing) * cross;
  }
  // A degenerate ring (collinear points) has no centre of area; the average of
  // the vertices is the honest fallback and never divides by zero.
  if (Math.abs(twiceArea) < 1e-9) {
    return {
      x: vertices.reduce((sum, v) => sum + v.easting, 0) / vertices.length,
      y: vertices.reduce((sum, v) => sum + v.northing, 0) / vertices.length,
    };
  }
  const factor = 1 / (3 * twiceArea);
  return { x: x * factor, y: y * factor };
}

/** The longest edge, which sets a text height that reads at any parcel size. */
function longestEdge(vertices: readonly CopyRow[]): number {
  let longest = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    longest = Math.max(longest, Math.hypot(b.easting - a.easting, b.northing - a.northing));
  }
  return longest;
}

const DXF_LAYERS = [
  { name: "PARCEL", color: DXF_COLOR.green },
  { name: "POINTS", color: DXF_COLOR.yellow },
  { name: "AREA", color: DXF_COLOR.cyan },
] as const;

export function buildParcelDxf(parcel: ParcelExport): string {
  const vertices = ringVertices(parcel.rows);
  if (vertices.length < 3) throw new Error("NOT_A_POLYGON");

  const eastings = vertices.map((row) => row.easting);
  const northings = vertices.map((row) => row.northing);
  // 1% of the longest side, floored at 0.5m: a label on a 20m plot stays
  // readable and one on a 2km plot does not swamp the drawing.
  const textHeight = Math.max(0.5, longestEdge(vertices) * 0.01);

  const dxf = new DxfBuilder(
    {
      minX: Math.min(...eastings), minY: Math.min(...northings),
      maxX: Math.max(...eastings), maxY: Math.max(...northings),
    },
    DXF_LAYERS,
    6, // metres
  );

  dxf.polyline("PARCEL", vertices.map((row) => ({ x: row.easting, y: row.northing })), true);

  for (const row of vertices) {
    dxf.point("POINTS", row.easting, row.northing);
    dxf.text("POINTS", row.label, row.easting + textHeight * 0.6, row.northing + textHeight * 0.4, textHeight);
  }

  if (typeof parcel.areaSquareMeters === "number" && Number.isFinite(parcel.areaSquareMeters)) {
    const centre = centroid(vertices);
    dxf.text("AREA", `${dxfNumber(parcel.areaSquareMeters)} m2`, centre.x, centre.y, textHeight);
  }

  return dxf.toString();
}

function xmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Every row must carry a WGS84 pair: KML has no other coordinate system. */
export function canExportKml(parcel: ParcelExport): boolean {
  return parcel.rows.length >= 3 && parcel.rows.every((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon));
}

export function buildParcelKml(parcel: ParcelExport): string {
  if (!canExportKml(parcel)) throw new Error("NO_GEOGRAPHIC_PAIRS");
  const vertices = ringVertices(parcel.rows);
  const title = parcel.name ?? "Parcel";
  // KML is lon,lat,alt — the opposite order to every table in this tool, which
  // is the single easiest thing to get wrong here.
  const coord = (row: CopyRow) => `${(row.lon as number).toFixed(8)},${(row.lat as number).toFixed(8)},0`;
  // A LinearRing must repeat its first point as its last.
  const ring = [...vertices, vertices[0]].map(coord).join(" ");

  const placemarks = vertices
    .map((row) => [
      "    <Placemark>",
      `      <name>${xmlText(row.label)}</name>`,
      `      <Point><coordinates>${coord(row)}</coordinates></Point>`,
      "    </Placemark>",
    ].join("\n"))
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    "  <Document>",
    `    <name>${xmlText(title)}</name>`,
    "    <Placemark>",
    `      <name>${xmlText(title)}</name>`,
    typeof parcel.areaSquareMeters === "number" && Number.isFinite(parcel.areaSquareMeters)
      ? `      <description>${dxfNumber(parcel.areaSquareMeters)} m2</description>`
      : "",
    "      <Polygon><outerBoundaryIs><LinearRing>",
    `        <coordinates>${ring}</coordinates>`,
    "      </LinearRing></outerBoundaryIs></Polygon>",
    "    </Placemark>",
    placemarks,
    "  </Document>",
    "</kml>",
  ].filter(Boolean).join("\n");
}

/**
 * The parcel as a spreadsheet — in ONE coordinate system, the one on screen.
 *
 * It used to put every form it had into one file: point, easting, northing,
 * latitude AND longitude on every row. That is not a coordinate table, it is
 * two tables printed on top of each other, and nothing downstream wants it. A
 * total station is given eastings; a handheld GPS is given degrees; a
 * spreadsheet that holds both is one somebody has to split by hand before it
 * is of use to either.
 *
 * Worse, a document that carries only degrees produced `NaN,NaN` in the two
 * metric columns, on every row.
 *
 * So it exports what the reader is looking at: a projected table gives
 * Point/Easting/Northing, and a geographic-only one gives
 * Point/Latitude/Longitude. Millimetres for metres and eight decimals for
 * degrees — the precision each is actually surveyed to.
 */
export function buildParcelCsv(parcel: ParcelExport): string {
  const projected = parcel.rows.length > 0
    && parcel.rows.every((row) => Number.isFinite(row.easting) && Number.isFinite(row.northing));

  if (projected) {
    const body = formatPoints(parcel.rows, "csv").split("\n");
    if (body.length <= 1) return "";
    const [, ...rows] = body;
    return ["Point,Easting,Northing", ...rows].join("\n");
  }

  const geographic = parcel.rows.filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon));
  if (geographic.length === 0) return "";
  return [
    "Point,Latitude,Longitude",
    ...geographic.map((row) =>
      `${normalizeLabel(row.label)},${(row.lat as number).toFixed(8)},${(row.lon as number).toFixed(8)}`),
  ].join("\n");
}

/** `<parcel or plan id>-<zone><hemisphere>.<ext>`, safe on every filesystem. */
export function parcelFileName(parcel: ParcelExport, format: ExportFormat): string {
  // The slash and the space are escaped: an unescaped `/` inside a character
  // class is legal, but it left the space beside it outside the class, so a
  // parcel named "Plan 7/A" kept its space in the file name.
  const base = (parcel.name ?? "parcel").trim().replace(/[<>:"\/\\|?*\s-]+/g, "_") || "parcel";
  const grid = parcel.zone ? `-${parcel.zone}${parcel.hemisphere ?? "N"}` : "";
  return `${base}${grid}.${format}`;
}

export const EXPORT_MIME: Record<ExportFormat, string> = {
  dxf: "application/dxf",
  kml: "application/vnd.google-earth.kml+xml",
  csv: "text/csv;charset=utf-8",
};

export function buildParcelExport(parcel: ParcelExport, format: ExportFormat): string {
  switch (format) {
    case "dxf": return buildParcelDxf(parcel);
    case "kml": return buildParcelKml(parcel);
    case "csv": return buildParcelCsv(parcel);
    default: {
      const exhaustive: never = format;
      void exhaustive;
      return "";
    }
  }
}

/** Whether a format can be produced from this parcel at all. */
export function canExport(parcel: ParcelExport, format: ExportFormat): boolean {
  if (parcel.rows.length === 0) return false;
  if (format === "kml") return canExportKml(parcel);
  const projected = parcel.rows.every((row) => Number.isFinite(row.easting) && Number.isFinite(row.northing));
  if (format === "dxf") return projected && ringVertices(parcel.rows).length >= 3;
  return projected;
}
