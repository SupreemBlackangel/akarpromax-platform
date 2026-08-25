import { NextRequest, NextResponse } from "next/server";
import { extractDocumentData } from "@/lib/land/ocr/ocr-engine";
import { resolveLandDocument, type LandLocationResult } from "@/lib/land/intelligence";
import { convertWithProj4 } from "@/lib/land/intelligence/crs-detector";
import { centroidOf, dedupePoints } from "@/lib/land/intelligence/geometry-builder";
import { extractCoordinateEvidence } from "@/lib/geo/evidence-extraction";
import {
  crsAwareArea,
  haversineDistance,
  isValidCoordinate,
  type GeoPoint,
} from "@/lib/land/geo/coordinate-utils";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
/** Top-level request budget — the entire handler must finish within this. */
const REQUEST_TIMEOUT_MS = 150_000;
// .jfif is an ordinary JPEG under the extension Windows and Edge use.
const ALLOWED_EXTENSIONS = [".pdf", ".csv", ".txt", ".jpg", ".jpeg", ".jfif", ".png", ".webp", ".dxf", ".kml", ".kmz", ".zip"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/dxf",
  "application/vnd.google-earth.kml+xml",
  "application/vnd.google-earth.kmz",
  "application/zip",
];

type FileKind = "image" | "pdf" | "docx" | "text" | "dxf" | "kml" | "other";

function fileKind(mimeType: string, fileName: string): FileKind {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  if (mimeType.includes("dxf") || ext === "dxf") return "dxf";
  if (mimeType.includes("kml") || mimeType.includes("kmz") || ext === "kml" || ext === "kmz") return "kml";
  if (mimeType.startsWith("text/") || mimeType === "application/json" || ext === "txt" || ext === "csv" || ext === "tsv") return "text";
  return "other";
}

function parseDxfPoints(text: string): { x: number; y: number }[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const out: { x: number; y: number }[] = [];
  let pendingX: number | undefined;
  for (let i = 0; i < lines.length; i++) {
    const code = lines[i];
    const val = Number(lines[i + 1]);
    if (code === "10" && Number.isFinite(val)) {
      pendingX = val;
    } else if (code === "20" && Number.isFinite(val) && pendingX !== undefined) {
      if (pendingX !== 0 || val !== 0) out.push({ x: pendingX, y: val });
      pendingX = undefined;
    }
  }
  return out;
}

function parseKmlPoints(xml: string): GeoPoint[] {
  const out: GeoPoint[] = [];
  const tagRe = /<coordinates[^>]*>([\s\S]*?)<\/coordinates>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(xml)) !== null) {
    const triplets = match[1].trim().split(/\s+/);
    for (const triplet of triplets) {
      const parts = triplet.split(",");
      if (parts.length < 2) continue;
      const lon = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (Number.isFinite(lon) && Number.isFinite(lat)) out.push({ lat, lng: lon });
    }
  }
  return out;
}

function extractPointsFromText(raw: string): GeoPoint[] {
  return extractCoordinateEvidence(raw)
    .filter((e) => e.point)
    .map((e) => ({ lat: e.point!.lat, lng: e.point!.lon }));
}

function pointsFromResolvedGeometry(result: LandLocationResult): GeoPoint[] {
  const coordinates = result.geometry?.coordinates;
  if (Array.isArray(coordinates)) {
    return coordinates.map((point) => ({ lat: point.lat, lng: point.lon }));
  }
  if (coordinates) return [{ lat: coordinates.lat, lng: coordinates.lon }];
  return (result.evidence?.coordinatePairs ?? []).map((point) => ({ lat: point.lat, lng: point.lon }));
}

function buildGeometry(points: GeoPoint[], crs?: { kind: string; zone?: number; northernHemisphere?: boolean } | null) {
  const valid = points.filter((p) => isValidCoordinate(p.lat, p.lng));
  const deduped = dedupePoints(valid.map((p) => ({ lat: p.lat, lon: p.lng })));
  if (deduped.length < 3) return null;
  const polygon: GeoPoint[] = deduped.map((p) => ({ lat: p.lat, lng: p.lon }));
  const areaResult = crsAwareArea(polygon, crs ?? null);
  let perimeter = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    perimeter += haversineDistance(a, b) * 1000;
  }
  const center = centroidOf(deduped) ?? deduped[0];
  return {
    area: areaResult.area,
    areaMethod: areaResult.method,
    areaCrs: areaResult.crs,
    perimeter,
    pointCount: polygon.length,
    center: { lat: center.lat, lng: center.lon },
  };
}

export async function POST(request: NextRequest) {
  return Promise.race([
    handleAnalyzeRequest(request),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), REQUEST_TIMEOUT_MS),
    ),
  ]).catch((error) => {
    if ((error as Error).message === 'REQUEST_TIMEOUT') {
      console.error('[Land Analyze API] Request timed out after', REQUEST_TIMEOUT_MS, 'ms');
      return NextResponse.json(
        { error: 'انتهت مهلة التحليل، جرّب ملفاً أصغر أو إدخال الإحداثيات يدوياً', code: 'REVIEW_REQUIRED' },
        { status: 422 },
      );
    }
    console.error("[Land Analyze API] Error:", error);
    return NextResponse.json({ error: "فشل في تحليل الأرض" }, { status: 500 });
  });
}

async function handleAnalyzeRequest(request: NextRequest) {
    const formData = await request.formData();
    const file = formData.get("file");
    const text = (formData.get("text") as string | null) ?? "";
    const name = (formData.get("name") as string | null) ?? "";

    if (!file && !text.trim()) {
      return NextResponse.json({ error: "يرجى رفع ملف أو إدخال بيانات" }, { status: 400 });
    }

    if (file instanceof File) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File exceeds 5 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).` },
          { status: 400 },
        );
      }
      const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
          { status: 400 },
        );
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type) && ext !== ".kmz") {
        return NextResponse.json(
          { error: "Unsupported MIME type. Please upload a supported file." },
          { status: 400 },
        );
      }
    }

    let coordinates: GeoPoint[] = [];
    let extractedData: Record<string, unknown> = {};
    let resolvedCrs: { kind: string; zone?: number; northernHemisphere?: boolean } | null = null;
    let message = "تم تحليل الأرض بنجاح";

    if (file instanceof File) {
      const fileName = file.name ?? "upload";
      const mimeType = file.type ?? "";
      const kind = fileKind(mimeType, fileName);
      const buffer = await file.arrayBuffer();
      const sizeBytes = buffer.byteLength;

      if (kind === "image" || kind === "pdf" || kind === "docx") {
        const ocr = await extractDocumentData(buffer, mimeType);
        extractedData = {
          ...ocr.extractedData,
          ocrConfidence: ocr.confidence,
          // Safe, content-free quality summary for the caller.
          ocrQuality: ocr.quality,
        };
        const result = await resolveLandDocument({
          metadata: { fileName, mimeType, sizeBytes },
          ocrText: ocr.text,
          // The engine reads the page, not a string: text-layer words and OCR
          // words arrive in the same positioned shape and take the same path.
          positionedItems: ocr.positionedItems,
          // Rows the OCR consensus could not resolve join the row account.
          ocrRejections: ocr.cellRejections,
        });
        // The resolver repairs self-intersecting source order before building
        // a polygon. Reuse that order here so area/perimeter are not computed
        // from the raw, crossing table order.
        coordinates = pointsFromResolvedGeometry(result);
        // Extract CRS from resolver for CRS-aware area calculation
        resolvedCrs = result.crsSelection?.epsg
          ? { kind: 'utm', zone: result.crsSelection.zone, northernHemisphere: result.crsSelection.hemisphere !== 'S' }
          : null;
        if (ocr.text && result.warnings?.some((w) => /ocr|scan/i.test(w))) {
          message = "تم التحليل مع معالجة OCR للوثيقة الممسوحة";
        }

        // CRS selection required: the table WAS read but no zone was declared.
        // Surface this instead of hiding it behind 422.
        if (coordinates.length === 0 && result.crsSelection?.required) {
          return NextResponse.json({
            success: true,
            status: "PARTIALLY_RESOLVED",
            data: {
              coordinates: [],
              geometry: null,
              extractedData,
              projectId: null,
              message: "تم قراءة جدول الإحداثيات بنجاح لكن يجب تحديد منطقة UTM قبل التحويل",
              crsSelection: {
                required: true,
                zone: result.crsSelection.zone,
                hemisphere: result.crsSelection.hemisphere,
                source: result.crsSelection.source,
              },
              rowAccount: result.rowAccount ?? null,
              layoutTables: result.layoutTables ?? null,
              documentIntelligence: result.documentIntelligence ?? null,
              warnings: result.warnings,
              status: result.status,
            },
          });
        }

        // Coordinate group selection required.
        if (coordinates.length === 0 && result.coordinateGroupSelectionRequired) {
          return NextResponse.json({
            success: true,
            status: "PARTIALLY_RESOLVED",
            data: {
              coordinates: [],
              geometry: null,
              extractedData,
              projectId: null,
              message: "تم العثور على مجموعات إحداثيات متعددة، يجب اختيار المجموعة الصحيحة",
              coordinateGroups: result.coordinateGroups ?? null,
              rowAccount: result.rowAccount ?? null,
              warnings: result.warnings,
              status: result.status,
            },
          });
        }
      } else if (kind === "dxf") {
        const raw = Buffer.from(buffer).toString("utf8");
        const pts = parseDxfPoints(raw);
        coordinates = pts.map((p) => {
          const wgs = convertWithProj4(p.x, p.y, 38, true);
          return { lat: wgs.lat, lng: wgs.lon };
        });
        message = "تم استخراج حدود الأرض من ملف DXF";
      } else if (kind === "kml") {
        const raw = Buffer.from(buffer).toString("utf8");
        coordinates = parseKmlPoints(raw);
        message = "تم استخراج حدود الأرض من ملف KML";
      } else {
        const raw = Buffer.from(buffer).toString("utf8");
        if (raw.trim()) {
          const result = await resolveLandDocument({
            metadata: { fileName, mimeType, sizeBytes, nativeText: raw },
          });
          coordinates = pointsFromResolvedGeometry(result);
          if (coordinates.length === 0) coordinates = extractPointsFromText(raw);
        }
      }
    } else if (text.trim()) {
      const result = await resolveLandDocument({
        metadata: { fileName: name || "manual-input", mimeType: "text/plain", nativeText: text },
      });
      coordinates = pointsFromResolvedGeometry(result);
      if (coordinates.length === 0) coordinates = extractPointsFromText(text);
    }

    const unique: GeoPoint[] = [];
    for (const p of coordinates) {
      if (!unique.some((q) => Math.abs(q.lat - p.lat) < 1e-9 && Math.abs(q.lng - p.lng) < 1e-9)) unique.push(p);
    }

    if (unique.length === 0) {
      return NextResponse.json(
        { error: "لم نتمكن من استخراج إحداثيات من الملف، جرّب إدخال الإحداثيات يدوياً" },
        { status: 422 },
      );
    }

    const geometry = buildGeometry(unique, resolvedCrs);

    return NextResponse.json({
      success: true,
      data: {
        coordinates: unique,
        geometry,
        extractedData,
        projectId: null,
        message,
      },
    });
}
