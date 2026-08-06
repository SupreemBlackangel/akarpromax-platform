import type { CadDocumentModel, CadEntity } from "./types";
import { computeBounds, roundTo } from "./coordinates";

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function layerColor(doc: CadDocumentModel, layerName: string): string {
  const layer = doc.layers.find((l) => l.name === layerName);
  if (!layer) return "#cccccc";
  if (typeof layer.color === "number") {
    const palette = ["", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ffffff", "#808080", "#aaaaaa"];
    return palette[layer.color] ?? "#cccccc";
  }
  return layer.color;
}

function entityToSvg(doc: CadDocumentModel, entity: CadEntity): string {
  const stroke = layerColor(doc, entity.layer);
  const strokeWidth = 1.5;
  switch (entity.type) {
    case "LINE":
      return `<line x1="${roundTo(entity.start.x)}" y1="${roundTo(entity.start.y)}" x2="${roundTo(entity.end.x)}" y2="${roundTo(entity.end.y)}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    case "LWPOLYLINE": {
      const points = entity.points.map((p) => `${roundTo(p.x)},${roundTo(p.y)}`).join(" ");
      return `<polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" ${entity.closed ? "" : ""} />`;
    }
    case "CIRCLE":
      return `<circle cx="${roundTo(entity.center.x)}" cy="${roundTo(entity.center.y)}" r="${roundTo(entity.radius)}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    case "ARC": {
      const a0 = (entity.startAngleDeg * Math.PI) / 180;
      const a1 = (entity.endAngleDeg * Math.PI) / 180;
      const r = entity.radius;
      const cx = entity.center.x;
      const cy = entity.center.y;
      const x0 = cx + r * Math.cos(a0);
      const y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);
      const sweep = a1 > a0 ? 1 : 0;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      return `<path d="M ${roundTo(x0)} ${roundTo(y0)} A ${roundTo(r)} ${roundTo(r)} 0 ${large} ${sweep} ${roundTo(x1)} ${roundTo(y1)}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
    }
    case "POINT":
      return `<circle cx="${roundTo(entity.position.x)}" cy="${roundTo(entity.position.y)}" r="1" fill="${stroke}" />`;
    case "TEXT":
    case "MTEXT":
      return `<text x="${roundTo(entity.position.x)}" y="${roundTo(entity.position.y)}" font-size="${roundTo(entity.height)}" fill="${stroke}">${esc(entity.text)}</text>`;
    case "HATCH": {
      const points = entity.boundary.map((p) => `${roundTo(p.x)},${roundTo(p.y)}`).join(" ");
      return `<polygon points="${points}" fill="${stroke}" fill-opacity="0.25" stroke="${stroke}" stroke-width="0.75" />`;
    }
    case "DIMENSION":
      return (
        `<line x1="${roundTo(entity.start.x)}" y1="${roundTo(entity.start.y)}" x2="${roundTo(entity.end.x)}" y2="${roundTo(entity.end.y)}" stroke="${stroke}" stroke-width="0.75" stroke-dasharray="4,3" />` +
        `<text x="${roundTo((entity.start.x + entity.end.x) / 2)}" y="${roundTo((entity.start.y + entity.end.y) / 2 - entity.offset * 0.5)}" font-size="${roundTo(Math.max(2, Math.abs(entity.offset) * 0.2))}" fill="${stroke}">${esc(entity.text ?? "")}</text>`
      );
    default:
      return "";
  }
}

export function generateSvg(doc: CadDocumentModel): string {
  const allPoints: { x: number; y: number }[] = [];
  for (const entity of doc.entities) {
    switch (entity.type) {
      case "LINE":
        allPoints.push(entity.start, entity.end);
        break;
      case "LWPOLYLINE":
        allPoints.push(...entity.points);
        break;
      case "CIRCLE":
        allPoints.push({ x: entity.center.x - entity.radius, y: entity.center.y - entity.radius }, { x: entity.center.x + entity.radius, y: entity.center.y + entity.radius });
        break;
      case "ARC":
        allPoints.push({ x: entity.center.x - entity.radius, y: entity.center.y - entity.radius }, { x: entity.center.x + entity.radius, y: entity.center.y + entity.radius });
        break;
      case "POINT":
        allPoints.push(entity.position);
        break;
      case "TEXT":
      case "MTEXT":
        allPoints.push(entity.position);
        break;
      case "HATCH":
        allPoints.push(...entity.boundary);
        break;
      case "DIMENSION":
        allPoints.push(entity.start, entity.end);
        break;
    }
  }
  const bounds = computeBounds(
    [{ points: allPoints }],
    { minX: -50, maxX: 50, minY: -50, maxY: 50 },
  );
  const pad = 20;
  const width = Math.ceil(bounds.maxX - bounds.minX + pad * 2);
  const height = Math.ceil(bounds.maxY - bounds.minY + pad * 2);
  const viewBox = `${roundTo(bounds.minX - pad)} ${roundTo(bounds.minY - pad)} ${width} ${height}`;

  const layerDefs = doc.layers
    .filter((l) => typeof l.color === "string")
    .map((l) => esc(l.name))
    .join(", ");

  const body = doc.entities.map((e) => entityToSvg(doc, e)).join("\n  ");

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">\n` +
    `  <rect width="100%" height="100%" fill="#ffffff" />\n` +
    `  <g transform="scale(1,-1)">\n` +
    `  ${body}\n` +
    `  </g>\n` +
    `  <!-- layers: ${layerDefs} -->\n` +
    `</svg>\n`
  );
}
