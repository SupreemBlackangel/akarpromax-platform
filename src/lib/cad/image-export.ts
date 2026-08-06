import type { CadDocumentModel } from "./types";
import { computeBounds, roundTo } from "./coordinates";

function resolveColor(layerColor: CadDocumentModel["layers"][number]["color"]): string {
  if (typeof layerColor === "number") {
    const palette = ["", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ffffff", "#808080", "#aaaaaa"];
    return palette[layerColor] ?? "#cccccc";
  }
  return layerColor;
}

function strokeColorFor(doc: CadDocumentModel, layerName: string): string {
  const layer = doc.layers.find((l) => l.name === layerName);
  return layer ? resolveColor(layer.color) : "#cccccc";
}

export async function generatePng(
  doc: CadDocumentModel,
  opts: { scale?: number } = {},
): Promise<Blob> {
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
  const baseScale = opts.scale ?? 8;
  const pad = 40;
  const width = Math.max(64, Math.ceil((bounds.maxX - bounds.minX + pad * 2) * baseScale));
  const height = Math.max(64, Math.ceil((bounds.maxY - bounds.minY + pad * 2) * baseScale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Flip Y so CAD coordinates map with Y-up onto the page.
  const toPx = (x: number, y: number) => ({
    px: (x - bounds.minX + pad) * baseScale,
    py: height - (y - bounds.minY + pad) * baseScale,
  });

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const entity of doc.entities) {
    const stroke = strokeColorFor(doc, entity.layer);
    ctx.strokeStyle = stroke;
    ctx.fillStyle = stroke;
    ctx.lineWidth = Math.max(1, baseScale * 0.25);
    switch (entity.type) {
      case "LINE": {
        const a = toPx(entity.start.x, entity.start.y);
        const b = toPx(entity.end.x, entity.end.y);
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();
        break;
      }
      case "LWPOLYLINE": {
        if (entity.points.length < 2) break;
        ctx.beginPath();
        const first = toPx(entity.points[0].x, entity.points[0].y);
        ctx.moveTo(first.px, first.py);
        for (let i = 1; i < entity.points.length; i++) {
          const p = toPx(entity.points[i].x, entity.points[i].y);
          ctx.lineTo(p.px, p.py);
        }
        if (entity.closed) ctx.closePath();
        ctx.stroke();
        break;
      }
      case "CIRCLE": {
        const c = toPx(entity.center.x, entity.center.y);
        ctx.beginPath();
        ctx.arc(c.px, c.py, entity.radius * baseScale, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "ARC": {
        const c = toPx(entity.center.x, entity.center.y);
        const a0 = (entity.startAngleDeg * Math.PI) / 180;
        const a1 = (entity.endAngleDeg * Math.PI) / 180;
        ctx.beginPath();
        ctx.arc(c.px, c.py, entity.radius * baseScale, a0, a1, false);
        ctx.stroke();
        break;
      }
      case "POINT": {
        const p = toPx(entity.position.x, entity.position.y);
        ctx.beginPath();
        ctx.arc(p.px, p.py, baseScale * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "TEXT":
      case "MTEXT": {
        const p = toPx(entity.position.x, entity.position.y);
        ctx.font = `${Math.max(8, entity.height * baseScale)}px sans-serif`;
        ctx.textAlign = entity.alignment === "center" ? "center" : entity.alignment === "right" ? "right" : "left";
        ctx.fillText(entity.text, p.px, p.py);
        break;
      }
      case "HATCH": {
        if (entity.boundary.length < 3) break;
        ctx.beginPath();
        const first = toPx(entity.boundary[0].x, entity.boundary[0].y);
        ctx.moveTo(first.px, first.py);
        for (let i = 1; i < entity.boundary.length; i++) {
          const p = toPx(entity.boundary[i].x, entity.boundary[i].y);
          ctx.lineTo(p.px, p.py);
        }
        ctx.closePath();
        ctx.globalAlpha = 0.25;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        break;
      }
      case "DIMENSION": {
        const a = toPx(entity.start.x, entity.start.y);
        const b = toPx(entity.end.x, entity.end.y);
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();
        ctx.setLineDash([]);
        const mid = toPx((entity.start.x + entity.end.x) / 2, (entity.start.y + entity.end.y) / 2 - entity.offset * 0.5);
        ctx.font = `${Math.max(8, Math.abs(entity.offset) * baseScale * 0.2)}px sans-serif`;
        ctx.fillText(entity.text ?? "", mid.px, mid.py);
        break;
      }
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG encoding failed."));
    }, "image/png");
  });
}

export { roundTo };
