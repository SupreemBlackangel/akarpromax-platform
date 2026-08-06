import type { CadDocumentModel } from "./types";
import { computeBounds } from "./coordinates";

export type PdfPaperSize = "A4" | "A3" | "A2" | "A1" | "A0";
export type PdfOrientation = "portrait" | "landscape";

export const PAPER_POINTS: Record<PdfPaperSize, [number, number]> = {
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
  A2: [1190.55, 1683.78],
  A1: [1683.78, 2383.94],
  A0: [2383.94, 3370.39],
};

function escPdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function layerRgb(doc: CadDocumentModel, layerName: string): [number, number, number] {
  const palette: [number, number, number][] = [
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 1, 1],
    [0, 0, 1],
    [1, 0, 1],
    [0, 0, 0],
    [0.5, 0.5, 0.5],
    [0.67, 0.67, 0.67],
  ];
  const layer = doc.layers.find((l) => l.name === layerName);
  const color = typeof layer?.color === "number" ? layer.color : 7;
  return palette[color] ?? [0, 0, 0];
}

type TextItem = {
  x: number;
  y: number;
  size: number;
  text: string;
  rgb: [number, number, number];
  center: boolean;
};

type ImageItem = {
  name: string;
  w: number;
  h: number;
  data: Uint8Array;
};

function arcBezier(cx: number, cy: number, r: number, a0: number, a1: number): string {
  let span = a1 - a0;
  while (span < 0) span += Math.PI * 2;
  if (span <= 0) span = Math.PI * 2;
  const segments = Math.max(1, Math.ceil(span / (Math.PI / 2)));
  const step = span / segments;
  const k = (4 / 3) * Math.tan(step / 4);
  let out = `${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} m\n`;
  for (let i = 0; i < segments; i++) {
    const s = a0 + i * step;
    const e = s + step;
    const x0 = cx + r * Math.cos(s);
    const y0 = cy + r * Math.sin(s);
    const x1 = cx + r * Math.cos(e);
    const y1 = cy + r * Math.sin(e);
    const cp1x = x0 - k * r * Math.sin(s);
    const cp1y = y0 + k * r * Math.cos(s);
    const cp2x = x1 + k * r * Math.sin(e);
    const cp2y = y1 - k * r * Math.cos(e);
    out += `${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x1} ${y1} c\n`;
  }
  out += "S\n";
  return out;
}

export async function generatePdf(
  doc: CadDocumentModel,
  opts: {
    paper?: PdfPaperSize;
    orientation?: PdfOrientation;
    margin?: number;
    includeTitleBlock?: boolean;
  } = {},
): Promise<Blob> {
  const paperSize = opts.paper ?? "A4";
  const orientation = opts.orientation ?? "landscape";
  const margin = opts.margin ?? 40;
  const includeTitleBlock = opts.includeTitleBlock ?? true;

  let [pw, ph] = PAPER_POINTS[paperSize];
  if (orientation === "landscape") {
    const tmp = pw;
    pw = ph;
    ph = tmp;
  }

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

  const drawW = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const drawH = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const titleBlockH = includeTitleBlock ? 46 : 0;
  const availW = pw - margin * 2;
  const availH = ph - margin * 2 - titleBlockH;
  const scale = Math.min(availW / drawW, availH / drawH);
  const offX = (pw - drawW * scale) / 2;
  const offY = margin + titleBlockH + (availH - drawH * scale) / 2;

  const tx = (x: number) => offX + (x - bounds.minX) * scale;
  const ty = (y: number) => offY + (y - bounds.minY) * scale;

  let content = `q\n1 1 1 rg 0 0 ${pw} ${ph} re f\n`;
  const textItems: TextItem[] = [];

  for (const entity of doc.entities) {
    const rgb = layerRgb(doc, entity.layer);
    const [r, g, b] = rgb;
    const lw = 0.6;
    switch (entity.type) {
      case "LINE": {
        content += `${r} ${g} ${b} RG ${lw} w ${tx(entity.start.x)} ${ty(entity.start.y)} m ${tx(entity.end.x)} ${ty(entity.end.y)} l S\n`;
        break;
      }
      case "LWPOLYLINE": {
        if (entity.points.length < 2) break;
        content += `${r} ${g} ${b} RG ${lw} w\n`;
        content += `${tx(entity.points[0].x)} ${ty(entity.points[0].y)} m\n`;
        for (let i = 1; i < entity.points.length; i++) {
          content += `${tx(entity.points[i].x)} ${ty(entity.points[i].y)} l\n`;
        }
        content += entity.closed ? "h S\n" : "S\n";
        break;
      }
      case "CIRCLE": {
        content += `${r} ${g} ${b} RG ${lw} w\n`;
        content += arcBezier(tx(entity.center.x), ty(entity.center.y), entity.radius * scale, 0, Math.PI * 2);
        break;
      }
      case "ARC": {
        content += `${r} ${g} ${b} RG ${lw} w\n`;
        content += arcBezier(tx(entity.center.x), ty(entity.center.y), entity.radius * scale, (entity.startAngleDeg * Math.PI) / 180, (entity.endAngleDeg * Math.PI) / 180);
        break;
      }
      case "POINT": {
        const cx = tx(entity.position.x);
        const cy = ty(entity.position.y);
        content += `${r} ${g} ${b} RG ${r} ${g} ${b} rg ${arcBezier(cx, cy, 1.2, 0, Math.PI * 2)}\n`;
        break;
      }
      case "TEXT":
      case "MTEXT": {
        textItems.push({
          x: tx(entity.position.x),
          y: ty(entity.position.y),
          size: Math.max(5, Math.min(24, entity.height * scale * 3)),
          text: entity.text,
          rgb,
          center: entity.alignment === "center",
        });
        break;
      }
      case "HATCH": {
        if (entity.boundary.length < 3) break;
        content += `${r} ${g} ${b} rg\n`;
        content += `${tx(entity.boundary[0].x)} ${ty(entity.boundary[0].y)} m\n`;
        for (let i = 1; i < entity.boundary.length; i++) {
          content += `${tx(entity.boundary[i].x)} ${ty(entity.boundary[i].y)} l\n`;
        }
        content += "h f\n";
        break;
      }
      case "DIMENSION": {
        const ax = tx(entity.start.x);
        const ay = ty(entity.start.y);
        const bx = tx(entity.end.x);
        const by = ty(entity.end.y);
        content += `${r} ${g} ${b} RG 0.4 w ${ax} ${ay} m ${bx} ${by} l S\n`;
        textItems.push({
          x: (ax + bx) / 2,
          y: (ay + by) / 2,
          size: Math.max(5, Math.min(10, Math.abs(entity.offset) * scale)),
          text: entity.text ?? "",
          rgb,
          center: true,
        });
        break;
      }
    }
  }

  if (includeTitleBlock) {
    const tbY = margin + 10;
    content += `0 0 0 RG 0.8 w ${margin} ${tbY} m ${pw - margin} ${tbY} l S\n`;
    content += `0 0 0 RG 0.4 w ${margin} ${tbY - 30} m ${pw - margin} ${tbY - 30} l S\n`;
    textItems.push({ x: margin + 8, y: tbY - 9, size: 9, text: `Drawing: ${doc.drawingName || "Untitled"}`, rgb: [0, 0, 0], center: false });
    textItems.push({ x: margin + 8, y: tbY - 20, size: 8, text: `Units: ${doc.units}  |  Entities: ${doc.entities.length}  |  Layers: ${doc.layers.length}`, rgb: [0, 0, 0], center: false });
  }

  // Render text: Latin directly, Arabic/Unicode via rasterized glyph image.
  const images: ImageItem[] = [];
  for (let i = 0; i < textItems.length; i++) {
    const item = textItems[i];
    if (!item.text) continue;
    const isLatin = /^[\x20-\x7E]*$/.test(item.text);
    if (isLatin) {
      const [r, g, b] = item.rgb;
      const esc = escPdfText(item.text);
      content += `BT /F1 ${item.size} Tf ${r} ${g} ${b} rg ${item.x} ${item.y} Td (${esc}) Tj ET\n`;
    } else {
      const raster = await rasterizeTextToImage(item);
      if (!raster) continue;
      const name = `Im${i}`;
      const img: ImageItem = { name, w: raster.w, h: raster.h, data: raster.data };
      images.push(img);
      content += `q ${img.w} 0 0 ${img.h} ${item.x - img.w / (item.center ? 2 : 0)} ${item.y} cm /${name} Do Q\n`;
    }
  }

  content += "Q\n";

  // ---- Assemble PDF binary ----
  const chunk = new TextEncoder();
  const enc = (s: string) => chunk.encode(s);

  const header = enc("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const fontObj = enc(`3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`);

  const imageObjects: Uint8Array[] = [];
  const imageNames: string[] = [];
  let imageObjId = 6;
  for (const img of images) {
    imageNames.push(img.name);
    const objBody = `${img.name} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${img.data.length} >>\nstream\n`;
    const tail = enc("\nendstream\nendobj\n");
    const head = enc(objBody);
    const combined = new Uint8Array(head.length + img.data.length + tail.length);
    combined.set(head, 0);
    combined.set(img.data, head.length);
    combined.set(tail, head.length + img.data.length);
    imageObjects.push(combined);
    imageObjId++;
  }

  const xobjectDict = imageNames.map((n) => `/${n} ${n} 0 R`).join(" ");
  const resources = `<< /Font << /F1 3 0 R >> ${imageNames.length ? `/XObject << ${xobjectDict} >>` : ""} >>`;
  const pageObj = enc(`4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Contents 5 0 R /Resources ${resources} >>\nendobj\n`);

  const contentBytes = enc(content);
  const streamObj = enc(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  const streamTail = enc(`\nendstream\nendobj\n`);

  const pagesObj = enc(`2 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n`);
  const catalogObj = enc(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // Assemble body
  const parts: Uint8Array[] = [header];
  const offsets: number[] = [];
  let pos = 0;
  const push = (p: Uint8Array) => {
    offsets.push(pos);
    parts.push(p);
    pos += p.length;
  };
  push(catalogObj);
  push(pagesObj);
  push(fontObj);
  push(pageObj);
  const streamStart = pos;
  push(streamObj);
  push(contentBytes);
  push(streamTail);
  void streamStart;
  for (const img of imageObjects) {
    push(img);
  }

  const xrefOffset = pos;
  const xrefHeader = enc(`xref\n0 ${imageObjects.length + 6}\n0000000000 65535 f \n`);
  parts.push(xrefHeader);
  const offsetLines = offsets.map((o) => enc(`${String(o).padStart(10, "0")} 00000 n \n`));
  for (const line of offsetLines) parts.push(line);
  const trailer = enc(`trailer\n<< /Size ${imageObjects.length + 6} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  parts.push(trailer);

  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const blob = new Uint8Array(total);
  let cursor = 0;
  for (const p of parts) {
    blob.set(p, cursor);
    cursor += p.length;
  }

  return new Blob([blob as unknown as BlobPart], { type: "application/pdf" });
}

async function rasterizeTextToImage(item: TextItem): Promise<{ w: number; h: number; data: Uint8Array } | null> {
  if (typeof document === "undefined") return null;
  const factor = 4;
  const w = Math.ceil((item.text.length * item.size * 0.7 + item.size) * factor);
  const h = Math.ceil(item.size * 2.4 * factor);
  if (w <= 0 || h <= 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.font = `${item.size * factor}px sans-serif`;
  ctx.fillStyle = "rgb(0,0,0)";
  ctx.textBaseline = "middle";
  ctx.textAlign = item.center ? "center" : "left";
  ctx.fillText(item.text, item.center ? w / 2 : 0, h / 2);
  const imageData = ctx.getImageData(0, 0, w, h);
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    rgb[i * 3] = imageData.data[i * 4];
    rgb[i * 3 + 1] = imageData.data[i * 4 + 1];
    rgb[i * 3 + 2] = imageData.data[i * 4 + 2];
  }
  return { w, h, data: rgb };
}
