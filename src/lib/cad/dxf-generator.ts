import type {
  CadArc,
  CadCircle,
  CadDimension,
  CadDocumentModel,
  CadEntity,
  CadHatch,
  CadLayer,
  CadLine,
  CadPoint,
  CadPolyline,
  CadText,
  CadMText,
} from "./types";
import { UNIT_INSUNITS, roundTo } from "./coordinates";

function pair(code: number, value: string | number): string {
  return `${String(code).padStart(3)}\n${String(value)}\n`;
}

function pointPair(px: CadPoint): string {
  const z = px.z ?? 0;
  return pair(10, roundTo(px.x)) + pair(20, roundTo(px.y)) + pair(30, roundTo(z));
}

function colorIndexFor(color: CadLayer["color"]): number {
  if (typeof color === "number") return Math.max(1, Math.min(255, Math.round(color)));
  const map: Record<string, number> = {
    red: 1,
    yellow: 2,
    green: 3,
    cyan: 4,
    blue: 5,
    magenta: 6,
    white: 7,
    grey: 8,
    gray: 8,
    "#ff0000": 1,
    "#ffff00": 2,
    "#00ff00": 3,
    "#00ffff": 4,
    "#0000ff": 5,
    "#ff00ff": 6,
    "#ffffff": 7,
  };
  const lower = String(color).toLowerCase();
  if (map[lower]) return map[lower];
  const hex = lower.replace("#", "");
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return 5; // approximating arbitrary hex to ACI blue
  }
  return 7;
}

function sanitizeLayerName(name: string): string {
  return name.replace(/[^\x20-\x7E]/g, "_").trim() || "0";
}

function sanitizeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\\P")
    .replace(/\n/g, "\\P");
}

function headerSection(doc: CadDocumentModel): string {
  const insunits = UNIT_INSUNITS[doc.units] ?? 6;
  return (
    pair(0, "SECTION") +
    pair(2, "HEADER") +
    pair(9, "$ACADVER") + pair(1, "AC1015") +
    pair(9, "$INSUNITS") + pair(70, insunits) +
    pair(9, "$MEASUREMENT") + pair(70, 1) +
    pair(0, "ENDSEC")
  );
}

function tablesSection(doc: CadDocumentModel): string {
  const layerNames = new Set<string>(["0", ...doc.layers.map((l) => sanitizeLayerName(l.name))]);

  let layerTable = pair(0, "TABLE") + pair(2, "LAYER") + pair(70, layerNames.size);
  for (const name of layerNames) {
    const layer = doc.layers.find((l) => sanitizeLayerName(l.name) === name);
    const color = layer ? layer.color : 7;
    layerTable +=
      pair(0, "LAYER") +
      pair(2, name) +
      pair(70, 0) +
      pair(62, colorIndexFor(color)) +
      pair(6, "CONTINUOUS");
  }
  layerTable += pair(0, "ENDTAB");

  let ltypeTable = pair(0, "TABLE") + pair(2, "LTYPE") + pair(70, 1);
  ltypeTable +=
    pair(0, "LTYPE") +
    pair(2, "CONTINUOUS") +
    pair(70, 0) +
    pair(3, "Solid line") +
    pair(72, 65) +
    pair(73, 0) +
    pair(40, 0.0);
  ltypeTable += pair(0, "ENDTAB");

  let styleTable = pair(0, "TABLE") + pair(2, "STYLE") + pair(70, 1);
  styleTable +=
    pair(0, "STYLE") +
    pair(2, "Standard") +
    pair(70, 0) +
    pair(40, 0.0) +
    pair(41, 1.0) +
    pair(50, 0.0) +
    pair(71, 0) +
    pair(42, 2.5) +
    pair(3, "txt") +
    pair(4, "");
  styleTable += pair(0, "ENDTAB");

  return (
    pair(0, "SECTION") +
    pair(2, "TABLES") +
    ltypeTable +
    layerTable +
    styleTable +
    pair(0, "ENDSEC")
  );
}

function entitySection(doc: CadDocumentModel): string {
  let out = pair(0, "SECTION") + pair(2, "ENTITIES");
  for (const entity of doc.entities) {
    out += entityToDxf(entity);
  }
  out += pair(0, "ENDSEC");
  return out;
}

function entityToDxf(entity: CadEntity): string {
  switch (entity.type) {
    case "LINE":
      return lineToDxf(entity);
    case "LWPOLYLINE":
      return polylineToDxf(entity);
    case "CIRCLE":
      return circleToDxf(entity);
    case "ARC":
      return arcToDxf(entity);
    case "TEXT":
      return textToDxf(entity);
    case "MTEXT":
      return mtextToDxf(entity);
    case "HATCH":
      return hatchToDxf(entity);
    case "DIMENSION":
      return dimensionToDxf(entity);
    case "POINT":
      return (
        pair(0, "POINT") +
        pair(8, sanitizeLayerName(entity.layer)) +
        pointPair(entity.position)
      );
    default:
      return "";
  }
}

function lineToDxf(line: CadLine): string {
  return (
    pair(0, "LINE") +
    pair(8, sanitizeLayerName(line.layer)) +
    pointPair(line.start) +
    pair(11, roundTo(line.end.x)) + pair(21, roundTo(line.end.y)) + pair(31, roundTo(line.end.z ?? 0))
  );
}

function polylineToDxf(poly: CadPolyline): string {
  let out =
    pair(0, "LWPOLYLINE") +
    pair(8, sanitizeLayerName(poly.layer)) +
    pair(90, poly.points.length) +
    pair(70, poly.closed ? 1 : 0);
  for (const p of poly.points) {
    out += pair(10, roundTo(p.x)) + pair(20, roundTo(p.y));
  }
  return out;
}

function circleToDxf(circle: CadCircle): string {
  return (
    pair(0, "CIRCLE") +
    pair(8, sanitizeLayerName(circle.layer)) +
    pointPair(circle.center) +
    pair(40, roundTo(circle.radius))
  );
}

function arcToDxf(arc: CadArc): string {
  return (
    pair(0, "ARC") +
    pair(8, sanitizeLayerName(arc.layer)) +
    pointPair(arc.center) +
    pair(40, roundTo(arc.radius)) +
    pair(50, roundTo(arc.startAngleDeg)) +
    pair(51, roundTo(arc.endAngleDeg))
  );
}

function textToDxf(text: CadText): string {
  const height = text.height > 0 ? text.height : 2.5;
  const ha = text.alignment === "center" ? 1 : text.alignment === "right" ? 2 : 0;
  const va = text.alignment === "center" || text.alignment === "right" ? 1 : 0;
  return (
    pair(0, "TEXT") +
    pair(8, sanitizeLayerName(text.layer)) +
    pointPair(text.position) +
    pair(40, roundTo(height)) +
    pair(1, sanitizeText(text.text)) +
    pair(50, roundTo(text.rotationDeg ?? 0)) +
    pair(72, ha) +
    pair(11, roundTo(text.position.x)) + pair(21, roundTo(text.position.y)) + pair(31, 0) +
    pair(73, va)
  );
}

function mtextToDxf(text: CadMText): string {
  const height = text.height > 0 ? text.height : 2.5;
  const width = text.width && text.width > 0 ? text.width : 100;
  const clean = sanitizeText(text.text);
  const chunks = clean.match(/.{1,250}/g) ?? [clean];
  let out =
    pair(0, "MTEXT") +
    pair(8, sanitizeLayerName(text.layer)) +
    pointPair(text.position) +
    pair(40, roundTo(height)) +
    pair(41, roundTo(width)) +
    pair(71, 1) +
    pair(72, 5) +
    pair(7, "Standard");
  const first = chunks.shift() ?? "";
  out += pair(1, first);
  for (const chunk of chunks) {
    out += pair(3, chunk);
  }
  return out;
}

function hatchToDxf(hatch: CadHatch): string {
  if (hatch.boundary.length < 3) return "";
  const scale = hatch.scale && hatch.scale > 0 ? hatch.scale : 1;
  let out =
    pair(0, "HATCH") +
    pair(8, sanitizeLayerName(hatch.layer)) +
    pair(10, 0) + pair(20, 0) + pair(30, 0) +
    pair(210, 0) + pair(220, 0) + pair(230, 1) +
    pair(2, "SOLID") +
    pair(70, 1) +
    pair(71, 0) +
    pair(91, 1) +
    pair(92, 1) +
    pair(72, 1) +
    pair(73, 0) +
    pair(93, hatch.boundary.length);
  for (const p of hatch.boundary) {
    out += pair(10, roundTo(p.x)) + pair(20, roundTo(p.y));
  }
  out +=
    pair(97, 0) +
    pair(75, 1) +
    pair(76, 1) +
    pair(52, 0.0) +
    pair(41, roundTo(scale)) +
    pair(77, 0) +
    pair(78, 0) +
    pair(98, 0);
  return out;
}

function dimensionToDxf(dim: CadDimension): string {
  const dx = dim.end.x - dim.start.x;
  const dy = dim.end.y - dim.start.y;
  const length = Math.hypot(dx, dy);
  const midX = (dim.start.x + dim.end.x) / 2;
  const midY = (dim.start.y + dim.end.y) / 2;
  const nx = dy / (length || 1);
  const ny = -dx / (length || 1);
  const textPos = { x: midX + nx * dim.offset, y: midY + ny * dim.offset, z: 0 };
  const text = dim.text ?? `${roundTo(length, 3)}`;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    pair(0, "DIMENSION") +
    pair(8, sanitizeLayerName(dim.layer)) +
    pair(67, 0) +
    pair(10, roundTo(dim.start.x)) + pair(20, roundTo(dim.start.y)) + pair(30, 0) +
    pair(11, roundTo(textPos.x)) + pair(21, roundTo(textPos.y)) + pair(31, 0) +
    pair(12, roundTo(textPos.x)) + pair(22, roundTo(textPos.y)) + pair(32, 0) +
    pair(70, 0) +
    pair(71, 0) +
    pair(72, 0) +
    pair(1, sanitizeText(text)) +
    pair(3, "Standard") +
    pair(100, "AcDbDimension") +
    pair(100, "AcDbAlignedDimension") +
    pair(13, roundTo(dim.start.x)) + pair(23, roundTo(dim.start.y)) + pair(33, 0) +
    pair(14, roundTo(dim.end.x)) + pair(24, roundTo(dim.end.y)) + pair(34, 0) +
    pair(50, roundTo(angle)) +
    pair(51, 0) +
    pair(52, 0) +
    pair(53, 0)
  );
}

export function generateDxf(doc: CadDocumentModel): string {
  const body =
    headerSection(doc) +
    tablesSection(doc) +
    entitySection(doc) +
    pair(0, "EOF");
  return body;
}

export function validateGeneratedDxf(dxf: string): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!dxf || dxf.length === 0) {
    return { ok: false, issues: ["Generated DXF is empty."] };
  }
  if (!dxf.trimEnd().endsWith("EOF")) {
    issues.push("DXF does not end with EOF marker.");
  }
  const entityCount = (dxf.match(/\n0\n(?!SECTION|ENDSEC|TABLE|ENDTAB|EOF)\w+/g) ?? []).length;
  if (entityCount === 0) {
    issues.push("DXF contains no entities.");
  }
  const layerTable = dxf.includes("\n0\nLAYER\n");
  if (!layerTable) {
    issues.push("DXF is missing the LAYER table.");
  }
  return { ok: issues.length === 0, issues };
}
