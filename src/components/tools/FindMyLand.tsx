"use client";

import "leaflet/dist/leaflet.css";
import "@/src/styles/find-my-land.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  Layers,
  MapPin,
  Maximize2,
  MessageCircle,
  Minimize2,
  Navigation,
  RotateCcw,
  ScanLine,
  Send,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import type { Locale } from "@/src/types/site";
import {
  extractLandDetails,
  type ExtractedLandDetails,
} from "@/src/lib/tools/land-analysis";
import {
  dedupeGeometryPoints,
  parseProjectedSourceRows,
  sourcePointLabel,
} from "@/src/lib/tools/fml-display-policy";
import {
  UTM_ZONE_MAX,
  UTM_ZONE_MIN,
  formatUtmZone,
  isWithinUtmLatitudeBand,
  projectPointsToSharedUtm,
  utmEpsgCode,
  type Hemisphere,
} from "@/lib/geo/utm";
import {
  fromPdfjsTextItems,
  reconstructLayout,
  type PositionedItem,
} from "@/lib/land/intelligence/layout";
import {
  extractTablesFromLayout,
  parseNumericCell,
} from "@/lib/land/intelligence/table-extraction";
import {
  compactPositionedItems,
  fromOcrWordBoxes,
  parseTesseractTsv,
} from "@/lib/land/intelligence/positioned-evidence";
import {
  selectPagesForOcr,
  surveyVocabularyHits,
  type PageTextStats,
} from "@/lib/land/ocr/page-evidence";
import { chooseOcrLanguages, createOcrWorkerWithFallback } from "@/lib/land/ocr/languages";
import { ToolCalculatorShell } from "./ToolCalculatorShell";
import { ManualGeometryPanel } from "./find-my-land/ManualGeometryPanel";
import {
  type SourcePoint,
  type ManualDraft,
  type ConfirmedManualGeometry,
  type GeometryStatus,
  type ValidationResult,
  createInitialDraft,
  getPreviewPoints,
  validateManualGeometry,
  deriveGeometryStatus,
  computePolygonArea,
  computePerimeter,
  shouldShowManualGeometry,
  pushHistory,
  undo,
  redo,
} from "./find-my-land/useManualGeometry";

type Props = { locale: Locale };

type Stage = "idle" | "ready" | "reading" | "ocr" | "resolving" | "done" | "error";
/** The user's manual override of the detected coordinate system. */
type CrsMode = "auto" | "wgs84" | "utm";
type Point = { lat: number; lon: number };
type CoordinateRow = Point & {
  label: string;
  raw: string;
  crsHint: string;
  latText: string;
  lonText: string;
};

type EvidenceCoordinate = {
  source: string;
  text: string;
  raw: string;
  parsedLat?: number;
  parsedLon?: number;
  crsHint?: string;
};

type ResolveResponse = {
  id: string;
  status: string;
  center?: Point;
  geometry?: { type: string; coordinates: Point[] };
  locationConfidence?: string;
  boundaryConfidence?: string;
  crsConfidence?: string;
  crsSelection?: {
    required: boolean;
    zone?: number;
    hemisphere?: "N" | "S";
    source: "DOCUMENT" | "USER" | "OMAN_DEFAULT" | "COUNTRY_INFERENCE" | "NONE";
    epsg?: number;
  };
  utmOutOfRange?: boolean;
  duplicateSourcePoints?: number;
  coordinateGroups?: Array<{
    id: string;
    pointCount: number;
    center: Point;
    spanDegrees: number;
  }>;
  coordinateGroupSelectionRequired?: boolean;
  documentIntelligence?: {
    country: {
      code: string;
      label: { ar: string; en: string };
      confidence: number;
      level: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
      userSupplied: boolean;
      evidence: { kind: string; term: string }[];
    };
    documentType: {
      familyId: string;
      kind: string;
      label: { ar: string; en: string };
      confidence: number;
      level: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
      matchedKeywords: string[];
    };
    adapter: string;
    pageCount: number;
    arabicNumerals: boolean;
    surveyTables?: Array<{
      id: string;
      heading: string;
      rowCount: number;
      sequenceEvidence: string;
      closed: boolean;
      crs: string;
      zone?: number;
      hemisphere?: "N" | "S";
      epsg?: number;
      crsSelectionRequired: boolean;
      score: number;
    }>;
  };
  parcel?: {
    vertices: Array<{
      index: number;
      label: string;
      pointNumber?: string;
      page?: number;
      rowIndex?: number;
      sourceText: string;
      original: {
        easting?: number;
        northing?: number;
        zone?: number;
        hemisphere?: "N" | "S";
        latitude?: number;
        longitude?: number;
      };
      point: Point;
      crs: "wgs84" | "utm";
      confidence: number;
      extractedBy: string;
      warnings: string[];
    }>;
    boundary: {
      documentSequence: number[];
      distinctCount: number;
      duplicateIndices: number[];
      closingDuplicateIndex?: number;
      documentOrderValid: boolean;
      selfIntersections: { a: number; b: number }[];
      segments: Array<{
        fromIndex: number;
        toIndex: number;
        fromLabel: string;
        toLabel: string;
        lengthMeters: number;
        bearingDegrees: number;
        documentLengthMeters?: number;
        deviationMeters?: number;
      }>;
      perimeterMeters: number;
      areaSquareMeters?: number;
      orientation?: "CLOCKWISE" | "COUNTER_CLOCKWISE";
      areaComparison?: {
        computedSquareMeters: number;
        statedSquareMeters: number;
        differenceSquareMeters: number;
        differencePercent: number;
        verdict: "MATCH" | "REVIEW" | "MISMATCH";
      };
      sideLengthComparison?: {
        matched: number;
        total: number;
        maxDeviationMeters: number;
        verdict: "MATCH" | "REVIEW" | "MISMATCH";
      };
      suggestedSequence?: {
        order: number[];
        method: string;
        reason: string;
        confidence: number;
        areaSquareMeters: number;
      };
      validations: Array<{
        code: string;
        status: "PASS" | "WARNING" | "FAIL" | "NOT_APPLICABLE";
        detail?: string;
        measured?: number;
        expected?: number;
        deviation?: number;
        unit?: string;
      }>;
      planeExtentWarning: boolean;
    };
    documented: {
      sides: Array<{ direction: "N" | "S" | "E" | "W"; lengthMeters: number; raw: string }>;
      segments: Array<{ from: string; to: string; lengthMeters?: number; bearingDegrees?: number; raw: string }>;
      bearings: Array<{ degrees: number; raw: string }>;
      area?: { squareMeters: number; statedValue: number; unit: string; unitStated: boolean; raw: string };
    };
    orderConfirmedByUser: boolean;
    sequenceEvidence: string;
    closedByTopology: boolean;
  };
  resolvedAddress?: string;
  parcelIdentifiers?: { parcelId?: string; planId?: string; plotId?: string };
  warnings?: string[];
  evidence?: {
    coordinatePairs?: Point[];
    explicitCoordinates?: EvidenceCoordinate[];
    city?: string;
    district?: string;
    country?: string;
    landmarks?: string[];
    sourceReferences?: string[];
  };
  extraction?: {
    method?: string;
    charCount?: number;
    ocrUsed?: boolean;
    ocrConfidence?: number;
    aiUsed?: boolean;
    geocodingUsed?: boolean;
  };
  document?: { category?: string; classificationConfidence?: number };
  strategy?: {
    version: 1;
    path: string;
    requiresReview: boolean;
    reviewReasons: string[];
    evidence: Array<{
      code: string;
      status: "FOUND" | "INFERRED" | "CORRECTED" | "MISSING";
      confidence: number;
      count?: number;
    }>;
    validations: Array<{
      code: string;
      status: "PASS" | "WARNING" | "FAIL" | "NOT_APPLICABLE";
      measured?: number;
      expected?: number;
      deviation?: number;
      unit?: "m" | "m2" | "percent" | "points";
    }>;
    confidence: Record<"document" | "extraction" | "crs" | "location" | "boundary", {
      level: "HIGH" | "MEDIUM" | "LOW" | "UNRESOLVED";
      score: number;
      reasons: string[];
    }>;
  };
};

type AnalysisPayload = {
  result: ResolveResponse;
  extractedText: string;
  nativeText: string;
  ocrText: string;
  details: ExtractedLandDetails;
  ocrUsed: boolean;
  ocrConfidence?: number;
  /**
   * Positioned words from the first pass. Kept so correcting the coordinate
   * system re-reads the same table instead of falling back to flat text.
   */
  positionedItems?: PositionedItem[];
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = 60_000;
const ACCEPTED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "jfif", "webp"];

const STATUS_COPY: Record<string, { ar: string; en: string; tr: string }> = {
  RESOLVED_EXPLICIT_COORDINATES: {
    ar: "تم تحديد الأرض من الإحداثيات الواردة في الوثيقة",
    en: "The land was located from coordinates in the document",
    tr: "Arazi, belgedeki koordinatlardan bulundu",
  },
  RESOLVED_GEOCODED: {
    ar: "تم تحديد الموقع من بيانات العنوان الواردة في الوثيقة",
    en: "The location was identified from the document address",
    tr: "Konum, belgedeki adres bilgileriyle bulundu",
  },
  NEEDS_USER_CONFIRMATION: {
    ar: "وجدنا موقعًا مرجحًا ويحتاج إلى تأكيدك",
    en: "We found a likely location that needs your confirmation",
    tr: "Onayınızı gerektiren olası bir konum bulundu",
  },
  PARTIALLY_RESOLVED: {
    ar: "استخرجنا بيانات الأرض، لكن بعض تفاصيل الموقع تحتاج مراجعة",
    en: "Land data was extracted, but some location details need review",
    tr: "Arazi verileri çıkarıldı; bazı konum ayrıntıları incelenmeli",
  },
  UNRESOLVED: {
    ar: "تمت قراءة الوثيقة، ولم يظهر فيها جدول إحداثيات صالح للرسم",
    en: "The document was read, but no plottable coordinate table was found",
    tr: "Belge okundu, ancak çizilebilir koordinat tablosu bulunamadı",
  },
  INVALID_DOCUMENT: {
    ar: "تعذرت قراءة محتوى الملف بوضوح؛ جرّب نسخة أوضح أو ملف PDF أصليًا",
    en: "The file could not be read clearly; try a clearer copy or the original PDF",
    tr: "Dosya net okunamadı; daha net bir kopya veya özgün PDF deneyin",
  },
  NOT_LAND_DOCUMENT: {
    ar: "لم نتعرّف تلقائيًا على نوع الوثيقة؛ يمكنك مراجعة النص والبيانات المستخرجة أدناه",
    en: "The document type was not recognized automatically; review the extracted data below",
    tr: "Belge türü otomatik tanınmadı; aşağıdaki çıkarılan verileri inceleyin",
  },
};

const DOCUMENT_KIND_COPY: Record<string, { ar: string; en: string; tr: string }> = {
  PROPERTY_DEED: { ar: "وثيقة ملكية", en: "Property deed", tr: "Tapu belgesi" },
  SURVEY_REPORT: { ar: "تقرير مساحي", en: "Survey report", tr: "Ölçüm raporu" },
  CADASTRAL_SKETCH: { ar: "كروكي مساحي", en: "Cadastral sketch", tr: "Kadastro krokisi" },
  COORDINATE_SCHEDULE: { ar: "جدول إحداثيات", en: "Coordinate schedule", tr: "Koordinat çizelgesi" },
  SITE_PLAN: { ar: "مخطط موقع", en: "Site plan", tr: "Vaziyet planı" },
  MUNICIPAL_DOCUMENT: { ar: "وثيقة بلدية", en: "Municipal document", tr: "Belediye belgesi" },
  UNKNOWN_SURVEY_DOCUMENT: { ar: "وثيقة مساحية غير محددة", en: "Unknown survey document", tr: "Belirsiz ölçüm belgesi" },
};

const SEQUENCE_EVIDENCE_COPY: Record<string, { ar: string; en: string; tr: string }> = {
  EXPLICIT_LINE_TOPOLOGY: {
    ar: "ترتيب الأضلاع كما تذكره الوثيقة",
    en: "Edge order stated by the document",
    tr: "Belgede belirtilen kenar sırası",
  },
  EXPLICIT_POINT_NUMBERING: {
    ar: "ترقيم النقاط في الوثيقة",
    en: "Point numbering in the document",
    tr: "Belgedeki nokta numaralandırması",
  },
  ORDERED_COORDINATE_TABLE: {
    ar: "ترتيب صفوف الجدول",
    en: "Table row order",
    tr: "Tablo satır sırası",
  },
};

function areaVerdictCopy(verdict: string, locale: Locale): string {
  const copy: Record<string, { ar: string; en: string; tr: string }> = {
    MATCH: { ar: "متطابقة تقريبًا", en: "Effectively identical", tr: "Neredeyse aynı" },
    REVIEW: { ar: "فرق يحتاج مراجعة", en: "Difference needs review", tr: "Fark incelenmeli" },
    MISMATCH: { ar: "فرق كبير", en: "Large difference", tr: "Büyük fark" },
  };
  return copy[verdict]?.[locale] ?? verdict;
}

function formatMeters(value: number, locale: Locale): string {
  return value.toLocaleString(locale === "ar" ? "ar-SA" : locale === "tr" ? "tr-TR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function confidenceLevelCopy(level: string, locale: Locale): string {
  const copy: Record<string, { ar: string; en: string; tr: string }> = {
    HIGH: { ar: "عالية", en: "High", tr: "Yüksek" },
    MEDIUM: { ar: "متوسطة", en: "Medium", tr: "Orta" },
    LOW: { ar: "منخفضة", en: "Low", tr: "Düşük" },
    UNRESOLVED: { ar: "غير محسومة", en: "Unresolved", tr: "Çözümlenmedi" },
  };
  return copy[level]?.[locale] ?? level;
}

/** Any of the 60 UTM zones may be chosen, in either hemisphere. */
function isSelectableZone(zone: number): boolean {
  return Number.isInteger(zone) && zone >= UTM_ZONE_MIN && zone <= UTM_ZONE_MAX;
}

function fileExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_EXTENSIONS.includes(fileExtension(file))) {
    return "FILE_TYPE";
  }
  if (file.size > MAX_FILE_SIZE) return "FILE_SIZE";
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatWgs84(value: number): string {
  return value.toFixed(15).replace(/0+$/, "").replace(/\.$/, "");
}

function preciseDecimalFromRaw(raw: string, target: number): string | null {
  const matches = raw.match(/-?\d{1,3}\.\d{6,18}/g) ?? [];
  let best: { text: string; delta: number } | null = null;
  for (const text of matches) {
    const value = Number.parseFloat(text);
    if (!Number.isFinite(value) || Math.abs(value) > 180) continue;
    const delta = Math.abs(value - target);
    if (delta <= 1e-9 && (!best || delta < best.delta)) best = { text, delta };
  }
  return best?.text ?? null;
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function polygonAreaSqm(points: Point[]): number | null {
  if (points.length < 3) return null;
  const samePoint = (left: Point, right: Point) =>
    Math.abs(left.lat - right.lat) < 1e-12 && Math.abs(left.lon - right.lon) < 1e-12;
  const polygon = samePoint(points[0], points[points.length - 1]) ? points.slice(0, -1) : points;
  if (polygon.length < 3) return null;

  const unique = new Set(polygon.map((point) => `${point.lat.toFixed(12)},${point.lon.toFixed(12)}`));
  if (unique.size !== polygon.length) return null;

  const orientation = (a: Point, b: Point, c: Point) =>
    (b.lon - a.lon) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lon - a.lon);
  const intersects = (a: Point, b: Point, c: Point, d: Point) => {
    const abC = orientation(a, b, c);
    const abD = orientation(a, b, d);
    const cdA = orientation(c, d, a);
    const cdB = orientation(c, d, b);
    return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
      && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
  };

  for (let first = 0; first < polygon.length; first += 1) {
    const firstNext = (first + 1) % polygon.length;
    for (let second = first + 1; second < polygon.length; second += 1) {
      const secondNext = (second + 1) % polygon.length;
      const adjacent = first === second
        || firstNext === second
        || secondNext === first;
      if (!adjacent && intersects(polygon[first], polygon[firstNext], polygon[second], polygon[secondNext])) {
        return null;
      }
    }
  }

  const averageLat = polygon.reduce((sum, point) => sum + point.lat, 0) / polygon.length;
  const xFactor = 111_320 * Math.cos((averageLat * Math.PI) / 180);
  const yFactor = 110_540;
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const next = (index + 1) % polygon.length;
    const x1 = polygon[index].lon * xFactor;
    const y1 = polygon[index].lat * yFactor;
    const x2 = polygon[next].lon * xFactor;
    const y2 = polygon[next].lat * yFactor;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("IMAGE_PROCESSING_FAILED"))), "image/png");
  });
}

function cleanOcrText(text: string): string {
  let t = text;
  t = t.replace(/([أإاآٱ])/g, "ا");
  t = t.replace(/[ةﻩهه‌ۀ]/g, "ة");
  t = t.replace(/[ىيیۍ]/g, "ي");
  t = t.replace(/[ؤ]/g, "و");
  t = t.replace(/[ئۊ]/g, "ي");
  t = t.replace(/ـ/g, "");
  t = t.replace(/[ًٌٍَُِّْٰ]/g, "");
  t = t.replace(/[OoQ](?=\d)/g, "0");
  t = t.replace(/(?<=\d)[OoQ]/g, "0");
  t = t.replace(/\|(?=\d)/g, "1");
  t = t.replace(/(?<=\d)\|/g, "1");
  t = t.replace(/[,،](?=\d)/g, ".");
  t = t.replace(/(?<=\d)[,،]/g, ".");
  t = t.replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2");
  t = t.replace(/(\d)\s+(\d)/g, "$1$2");
  t = t.replace(/(\d{1,2})[.\s]*(\d{4,})/g, (match: string, p1: string, p2: string) => {
    if (p1.length <= 2 && p2.length >= 4) return p1 + "." + p2;
    return match;
  });
  t = t.replace(/[\n]{3,}/g, "\n\n");
  t = t.replace(/[\t]+/g, " ");
  t = t.replace(/[^\S\n]{2,}/g, " ");
  return t.trim();
}

function medianFilter(data: Uint8ClampedArray, w: number, h: number, size = 3) {
  const src = new Uint8ClampedArray(data);
  const half = Math.floor(size / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pixels: number[] = [];
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const px = Math.min(w - 1, Math.max(0, x + dx));
          const py = Math.min(h - 1, Math.max(0, y + dy));
          pixels.push(src[(py * w + px) * 4]);
        }
      }
      pixels.sort((a, b) => a - b);
      const median = pixels[Math.floor(pixels.length / 2)];
      const idx = (y * w + x) * 4;
      data[idx] = data[idx + 1] = data[idx + 2] = median;
    }
  }
}

function otsuThreshold(data: Uint8ClampedArray): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) hist[Math.round(data[i])]++;
  const total = data.length / 4;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0;
  let maxVariance = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const meanB = sumB / wB;
    const meanF = (sum - sumB) / wF;
    const between = wB * wF * (meanB - meanF) * (meanB - meanF);
    if (between > maxVariance) { maxVariance = between; threshold = t; }
  }
  return threshold;
}

function enhanceContrastStretch(data: Uint8ClampedArray) {
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min;
  if (range < 10) return;
  for (let i = 0; i < data.length; i += 4) {
    const stretched = Math.round(((data[i] - min) / range) * 255);
    data[i] = data[i + 1] = data[i + 2] = stretched;
  }
}

/** The raster an OCR pass actually saw, with the size its boxes are relative to. */
interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
}

async function preprocessImage(blob: Blob): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(blob);
  const sourceWidth = bitmap.width;
  const scale = Math.min(2.5, Math.max(1, 1800 / Math.max(1, sourceWidth)));
  const width = Math.min(2800, Math.round(bitmap.width * scale));
  const height = Math.round((bitmap.height * width) / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("IMAGE_PROCESSING_FAILED");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  for (let index = 0; index < data.length; index += 4) {
    data[index] = data[index + 1] = data[index + 2] =
      Math.round(0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]);
  }
  medianFilter(data, width, height, 3);
  enhanceContrastStretch(data);
  const threshold = otsuThreshold(data);
  for (let i = 0; i < data.length; i += 4) {
    const val = data[i] < threshold ? 0 : 255;
    data[i] = data[i + 1] = data[i + 2] = val;
  }
  context.putImageData(image, 0, 0);
  return { blob: await canvasToBlob(canvas), width, height };
}

async function cropSurveyTableImage(blob: Blob, tsv: string | null, sourceBlob: Blob = blob): Promise<Blob | null> {
  if (!tsv) return null;
  const entries = tsv
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split("\t"))
    .filter((columns) => columns.length >= 12)
    .map((columns) => ({
      left: Number(columns[6]),
      top: Number(columns[7]),
      width: Number(columns[8]),
      height: Number(columns[9]),
      text: columns.slice(11).join("\t").trim(),
    }))
    .filter((entry) => Number.isFinite(entry.left) && Number.isFinite(entry.top) && entry.width > 0 && entry.height > 0);

  const northing = entries.find((entry) => /NORTHING/i.test(entry.text));
  const easting = entries.find((entry) => /EASTING/i.test(entry.text));
  if (!northing || !easting || Math.abs(northing.top - easting.top) > Math.max(northing.height, easting.height) * 3) {
    return null;
  }

  const locatorBitmap = await createImageBitmap(blob);
  const headerLeft = Math.min(northing.left, easting.left);
  const headerRight = Math.max(northing.left + northing.width, easting.left + easting.width);
  const headerTop = Math.min(northing.top, easting.top);
  const headerHeight = Math.max(northing.height, easting.height);
  const locatorLeft = Math.max(0, Math.floor(headerLeft - locatorBitmap.width * 0.28));
  const locatorTop = Math.max(0, Math.floor(headerTop - headerHeight * 0.4));
  const locatorRight = Math.min(locatorBitmap.width, Math.ceil(headerRight + locatorBitmap.width * 0.17));
  const locatorBottom = Math.min(locatorBitmap.height, Math.ceil(locatorTop + Math.max(headerHeight * 9, locatorBitmap.height * 0.24)));
  const sourceBitmap = sourceBlob === blob ? locatorBitmap : await createImageBitmap(sourceBlob);
  const left = Math.floor((locatorLeft / locatorBitmap.width) * sourceBitmap.width);
  const top = Math.floor((locatorTop / locatorBitmap.height) * sourceBitmap.height);
  const right = Math.ceil((locatorRight / locatorBitmap.width) * sourceBitmap.width);
  const bottom = Math.ceil((locatorBottom / locatorBitmap.height) * sourceBitmap.height);
  if (sourceBitmap !== locatorBitmap) locatorBitmap.close();
  const cropWidth = Math.max(1, right - left);
  const cropHeight = Math.max(1, bottom - top);
  const outputWidth = Math.min(1_800, Math.max(1_200, Math.round(cropWidth * 3)));
  const outputHeight = Math.round((cropHeight * outputWidth) / cropWidth);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    sourceBitmap.close();
    throw new Error("IMAGE_PROCESSING_FAILED");
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(sourceBitmap, left, top, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);
  sourceBitmap.close();

  const image = context.getImageData(0, 0, outputWidth, outputHeight);
  const data = image.data;
  for (let index = 0; index < data.length; index += 4) {
    data[index] = data[index + 1] = data[index + 2] =
      Math.round(0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]);
  }
  medianFilter(data, outputWidth, outputHeight, 3);
  enhanceContrastStretch(data);
  context.putImageData(image, 0, 0);
  return canvasToBlob(canvas);
}

function numericOcrTextWithConfidence(tsv: string | null, fallback: string): string {
  if (!tsv) return fallback;
  const groups = new Map<string, { order: number; text: string; confidence: number }[]>();
  for (const line of tsv.split(/\r?\n/).slice(1)) {
    const columns = line.split("\t");
    if (columns.length < 12 || Number(columns[0]) !== 5) continue;
    const text = columns.slice(11).join("\t").trim();
    if (!text) continue;
    const key = columns.slice(1, 5).join(":");
    const words = groups.get(key) ?? [];
    words.push({ order: Number(columns[5]), text, confidence: Number(columns[10]) });
    groups.set(key, words);
  }

  const annotated = Array.from(groups.values()).map((words) => {
    words.sort((left, right) => left.order - right.order);
    const text = words.map((word) => word.text).join(" ");
    const numericWords = words.filter((word) => /^[0-9][0-9.,]*$/.test(word.text));
    if (numericWords.length >= 5 && /^\s*\d{1,3}\s+\d{1,3}\s+/.test(text)) {
      const northingConfidence = Math.max(0, Math.min(100, Math.round(numericWords[2].confidence)));
      const eastingConfidence = Math.max(0, Math.min(100, Math.round(numericWords[3].confidence)));
      return `${text} OCRCONF ${northingConfidence} ${eastingConfidence}`;
    }
    return text;
  }).filter(Boolean);

  return annotated.some((line) => /\bNORTHING\b/i.test(line)) ? annotated.join("\n") : fallback;
}

export interface OcrPageResult {
  /** Index into the images array that was recognised. */
  index: number;
  /** Tesseract TSV, from which word boxes are read. */
  tsv: string | null;
}

async function runOcr(
  images: Blob[],
  onProgress: (value: number) => void,
  sourceImages: Blob[] = images,
  languages = "ara+eng",
): Promise<{ text: string; confidence: number; languages: string; pages: OcrPageResult[] }> {
  const Tesseract = await import("tesseract.js");
  let activeIndex = 0;
  let workerTerminated = false;
  // A missing trained-data file must cost a language, never the document.
  const created = await createOcrWorkerWithFallback(
    (langs) => Tesseract.createWorker(langs, undefined, {
      logger: (message: { status: string; progress: number }) => {
        if (message.status !== "recognizing text") return;
        const pageProgress = (activeIndex + message.progress) / Math.max(1, images.length);
        onProgress(pageProgress);
      },
    }),
    languages,
  );
  const worker = created.worker;

  try {
    await worker.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      textord_heavy_nr: "1",
      tessedit_enable_dict_correction: "1",
    });
    const texts: string[] = [];
    const confidences: number[] = [];
    const numericTables: Blob[] = [];
    const pageResults: OcrPageResult[] = [];
    for (activeIndex = 0; activeIndex < images.length; activeIndex += 1) {
      const result = await worker.recognize(images[activeIndex], {}, { text: true, tsv: true });
      texts.push(cleanOcrText(result.data.text));
      confidences.push(result.data.confidence);
      pageResults.push({ index: activeIndex, tsv: (result.data as { tsv?: string }).tsv ?? null });

      if (/\b(?:NORTHING|EASTING|UTM)\b/i.test(result.data.text)) {
        const surveyTable = await cropSurveyTableImage(
          images[activeIndex],
          result.data.tsv,
          sourceImages[activeIndex] ?? images[activeIndex],
        );
        if (surveyTable) numericTables.push(surveyTable);
      }
    }

    await worker.terminate();
    workerTerminated = true;

    if (numericTables.length > 0) {
      const numericWorker = await Tesseract.createWorker("eng");
      try {
        await numericWorker.setParameters({
          preserve_interword_spaces: "1",
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
          textord_heavy_nr: "1",
          tessedit_enable_dict_correction: "1",
        });
        for (const table of numericTables) {
          const numericResult = await numericWorker.recognize(table, {}, { text: true, tsv: true });
          texts.push(`NUMERIC TABLE OCR\n${numericOcrTextWithConfidence(numericResult.data.tsv, numericResult.data.text)}`);
        }
      } finally {
        await numericWorker.terminate();
      }
    }
    const confidence = confidences.length
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : 0;
    return { text: texts.join("\n"), confidence, languages: created.languages, pages: pageResults };
  } finally {
    if (!workerTerminated) await worker.terminate();
  }
}

function inferDocumentCountry(value: string): string | undefined {
  const countries: readonly [string, RegExp][] = [
    ["OM", /(?:ع[ُ]?مان|\boman\b)/i],
    ["SA", /(?:السعوديه|السعودية|\bsaudi\b|kingdom\s+of\s+saudi)/i],
    ["AE", /(?:الامارات|الإمارات|\b(?:uae|united\s+arab\s+emirates)\b)/i],
    ["QA", /(?:قطر|\bqatar\b)/i],
    ["BH", /(?:البحرين|\bbahrain\b)/i],
    ["KW", /(?:الكويت|\bkuwait\b)/i],
  ];
  return countries.find(([, pattern]) => pattern.test(value))?.[0];
}

function translatedWarning(warning: string, locale: Locale): string {
  const lower = warning.toLowerCase();
  const options = lower.includes("self-intersect")
    ? {
        ar: "ترتيب النقاط في المستند ينتج تقاطعًا؛ عُرض كما ورد دون تغيير.",
        en: "The document order creates an intersection; it is shown unchanged.",
        tr: "Belgedeki nokta sırası kesişme oluşturuyor; değiştirilmeden gösterildi.",
      }
      : lower.includes("duplicate")
      ? {
          ar: "توجد نقطة مكررة في المستند؛ احتُفظ بها في الجدول والرسم.",
          en: "The document contains a repeated point; it remains in the table and drawing.",
          tr: "Belgede yinelenen bir nokta var; tabloda ve çizimde korundu.",
        }
      : lower.includes("utm zone") && lower.includes("inferred")
        ? {
            ar: "تم استنتاج نطاق UTM من دولة الوثيقة، وتحتاج الإحداثيات إلى مراجعة قبل الاعتماد الميداني.",
            en: "The UTM zone was inferred from the document country; review the coordinates before field use.",
            tr: "UTM bölgesi belge ülkesinden çıkarıldı; saha kullanımından önce koordinatları inceleyin.",
          }
      : lower.includes("ocr ambiguities corrected")
        ? {
            ar: "تمت مراجعة أرقام OCR الملتبسة حسابيًا بمقارنتها مع الأطوال والمساحة المكتوبة في الوثيقة.",
            en: "Ambiguous OCR digits were checked mathematically against the side lengths and area printed in the document.",
            tr: "Belirsiz OCR rakamları, belgede yazılı kenar uzunlukları ve alanla matematiksel olarak denetlendi.",
          }
      : lower.includes("unlabelled numeric pairs ignored")
        ? {
            ar: "تجاهلت الأداة مجموعات أرقام غير معنونة لأنها لم تحمل دليلًا كافيًا على أنها إحداثيات.",
            en: "Unlabelled number groups were ignored because they lacked enough evidence to be coordinates.",
            tr: "Koordinat olduğuna dair yeterli kanıt taşımayan etiketsiz sayı grupları yok sayıldı.",
          }
      : lower.includes("select utm zone")
        ? {
            ar: "تم العثور على جدول Easting/Northing، ويجب اختيار نطاق UTM ونصف الكرة قبل التحويل.",
            en: "An Easting/Northing table was found; select the UTM zone and hemisphere before conversion.",
            tr: "Bir Easting/Northing tablosu bulundu; dönüştürmeden önce UTM zonunu ve yarımküreyi seçin.",
          }
      : lower.includes("sanity validation")
        ? {
            ar: "رُفضت قيمة رقمية لأنها تضع الموقع خارج النطاق المنطقي للوثيقة.",
            en: "A numeric value was rejected because it placed the location outside the document's plausible bounds.",
            tr: "Konumu belgenin makul sınırları dışına taşıdığı için sayısal bir değer reddedildi.",
          }
      : lower.includes("no resolvable") || lower.includes("no explicit")
        ? {
            ar: "لم يظهر جدول إحداثيات صريح يمكن رسمه تلقائيًا.",
            en: "No explicit coordinate table could be plotted automatically.",
            tr: "Otomatik çizilebilen açık bir koordinat tablosu bulunamadı.",
          }
        : {
            ar: "تحتاج هذه النتيجة إلى مراجعة سريعة قبل اعتمادها ميدانيًا.",
            en: "This result needs a quick review before field use.",
            tr: "Bu sonuç saha kullanımından önce hızlıca incelenmelidir.",
          };
  return options[locale] ?? options.en;
}

export function FindMyLand({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{ remove: () => void } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [errorCode, setErrorCode] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  // Per-page text from the first pass, kept so a re-analysis keeps each piece
  // of evidence tied to its page instead of collapsing the document to one.
  const [documentPages, setDocumentPages] = useState<string[]>([]);
  const [copiedTarget, setCopiedTarget] = useState<"wgs" | "utm" | "all" | "share" | "export" | null>(null);
  const [actionError, setActionError] = useState("");
  const [utmZoneInput, setUtmZoneInput] = useState("");
  const [utmHemisphereInput, setUtmHemisphereInput] = useState<"N" | "S">("N");
  const [crsMode, setCrsMode] = useState<CrsMode>("auto");
  // The tool opens in focus mode: a survey map and a coordinate table need the
  // full content width, and the page rails can be brought back with one click.
  const [focusMode, setFocusMode] = useState(true);

  /**
   * Coordinate table view: the document's own values, or projected UTM.
   *
   * Null means "whichever suits this document", and a click pins the choice.
   * Deriving the default rather than storing it keeps the two in sync without a
   * setState inside an effect, which would re-render the table twice on every
   * analysis and is the cascading-render pattern this file otherwise avoids.
   */
  const [coordinateViewOverride, setCoordinateViewOverride] = useState<"wgs84" | "utm" | null>(null);

  /* ---- Manual Geometry Recovery state ---- */
  const [manualDraft, setManualDraft] = useState<ManualDraft | null>(null);
  const [manualDraftAnalysis, setManualDraftAnalysis] = useState<AnalysisPayload | null>(null);
  const [manualHistory, setManualHistory] = useState<ManualDraft[]>([]);
  const [manualHistoryIdx, setManualHistoryIdx] = useState(-1);
  const [manualConfirmed, setManualConfirmed] = useState<ConfirmedManualGeometry | null>(null);
  const [highlightedPointId, setHighlightedPointId] = useState<string | null>(null);

  const t = useCallback(
    (ar: string, en: string, tr: string) => (locale === "ar" ? ar : locale === "tr" ? tr : en),
    [locale],
  );

  // Focus mode gives the map and the coordinate table the width the platform
  // chrome would otherwise take. It is a page-level flag so the shell's ad
  // rails can step aside without the tool reaching into their markup.
  useEffect(() => {
    const root = document.body;
    if (focusMode) root.dataset.toolFocus = "on";
    else delete root.dataset.toolFocus;
    return () => {
      delete root.dataset.toolFocus;
    };
  }, [focusMode]);

  const reset = useCallback(() => {
    setFile(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setStage("idle");
    setProgress(0);
    setErrorCode("");
    setAnalysis(null);
    setCopiedTarget(null);
    setActionError("");
    setUtmZoneInput("");
    setUtmHemisphereInput("N");
    setCrsMode("auto");
    setDocumentPages([]);
    setManualDraft(null);
    setManualHistory([]);
    setManualHistoryIdx(-1);
    setManualConfirmed(null);
    setHighlightedPointId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectFile = useCallback((selected: File) => {
    const validation = validateFile(selected);
    if (validation) {
      setErrorCode(validation);
      setStage("error");
      return;
    }
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(selected);
    });
    setFile(selected);
    setAnalysis(null);
    setErrorCode("");
    setProgress(0);
    setStage("ready");
  }, []);

  const analyze = useCallback(async () => {
    if (!file) return;
    setErrorCode("");
    setAnalysis(null);
    setStage("reading");
    setProgress(5);
    setFocusMode(true);
    let analysisExpired = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      analysisExpired = true;
      controller.abort();
      setErrorCode("ANALYSIS_TIMEOUT");
      setStage("error");
    }, ANALYSIS_TIMEOUT_MS);

    try {
      let nativeText = "";
      let capturedPages: string[] = [];
      let ocrText = "";
      let ocrConfidence: number | undefined;
      let ocrUsed = false;
      const positionedItems: PositionedItem[] = [];

      if (file.type === "application/pdf" || fileExtension(file) === "pdf") {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        const pageTexts: string[] = [];
        const pageStats: PageTextStats[] = [];
        const pageFrames = new Map<number, { width: number; height: number }>();
        const imagePaintOps = new Set(
          Object.entries((pdfjs as unknown as { OPS?: Record<string, number> }).OPS ?? {})
            .filter(([name]) => /^paint(?:Image|Jpeg|InlineImage)/.test(name))
            .map(([, code]) => code),
        );

        // The text layer is read for its words *and* for where they sit. A
        // flattened string cannot tell a column from a coincidence.
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (analysisExpired) throw new Error("ANALYSIS_TIMEOUT");
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1 });
          pageFrames.set(pageNumber, { width: viewport.width, height: viewport.height });
          const content = await page.getTextContent();
          const pageText = content.items
            .filter((item): item is typeof item & { str: string } => "str" in item)
            .map((item) => item.str)
            .join(" ");
          pageTexts.push(pageText);

          const items = fromPdfjsTextItems(pageNumber, content.items as never);
          positionedItems.push(...items);

          let textArea = 0;
          for (const item of content.items) {
            if (!("str" in item) || !item.str.trim()) continue;
            const box = item as { width?: number; height?: number };
            textArea += (box.width ?? 0) * (box.height ?? 8);
          }
          let imageOperations = 0;
          try {
            const operators = await page.getOperatorList();
            imageOperations = operators.fnArray.reduce(
              (total: number, code: number) => total + (imagePaintOps.has(code) ? 1 : 0),
              0,
            );
          } catch {
            // A page whose operator list cannot be read contributes no image
            // evidence; it must never abort the analysis.
          }
          const tables = reconstructLayout(items);
          pageStats.push({
            page: pageNumber,
            textChars: pageText.replace(/\s/g, "").length,
            textCoverage: Math.min(1, textArea / Math.max(1, viewport.width * viewport.height)),
            imageOperations,
            numericRows: tables.reduce(
              (total, table) => total + table.rows.filter(
                (row) => row.cells.filter((cell) => parseNumericCell(cell.text) !== null).length >= 2,
              ).length,
              0,
            ),
            coordinateRows: extractTablesFromLayout(tables, { documentText: pageText })
              .reduce((total, reading) => total + reading.rows.length, 0),
            vocabularyHits: surveyVocabularyHits(pageText),
          });
          setProgress(5 + Math.round((pageNumber / pdf.numPages) * 25));
        }
        nativeText = pageTexts.join("\n").trim();
        capturedPages = pageTexts;

        // Which pages need reading as pictures is decided by what each page
        // shows, not by how long its text is and not by where it sits in the
        // document: a survey sketch is as likely to be page 30 as page 1.
        const ocrSelection = selectPagesForOcr(pageStats);
        if (ocrSelection.length > 0) {
          setStage("ocr");
          const images: Blob[] = [];
          const sourceImages: Blob[] = [];
          const frames: { page: number; imageWidth: number; imageHeight: number }[] = [];
          for (let index = 0; index < ocrSelection.length; index += 1) {
            if (analysisExpired) throw new Error("ANALYSIS_TIMEOUT");
            const pageNumber = ocrSelection[index].page;
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 2.2 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            const context = canvas.getContext("2d");
            if (!context) continue;
            await page.render({ canvas, canvasContext: context, viewport }).promise;
            const sourceImage = await canvasToBlob(canvas);
            sourceImages.push(sourceImage);
            const prepared = await preprocessImage(sourceImage);
            images.push(prepared.blob);
            frames.push({ page: pageNumber, imageWidth: prepared.width, imageHeight: prepared.height });
            setProgress(30 + Math.round(((index + 1) / ocrSelection.length) * 10));
          }
          if (images.length) {
            const languages = chooseOcrLanguages(`${file.name}\n${nativeText}`);
            const ocr = await runOcr(
              images,
              (value) => setProgress(40 + Math.round(value * 35)),
              sourceImages,
              languages,
            );
            ocrText = ocr.text;
            ocrConfidence = ocr.confidence;
            ocrUsed = true;
            // OCR words become the same positioned evidence the text layer
            // produces, so everything downstream reads one document.
            for (const result of ocr.pages) {
              const frame = frames[result.index];
              if (!frame) continue;
              const size = pageFrames.get(frame.page);
              if (!size) continue;
              positionedItems.push(...fromOcrWordBoxes(frame.page, parseTesseractTsv(result.tsv), {
                pageWidth: size.width,
                pageHeight: size.height,
                imageWidth: frame.imageWidth,
                imageHeight: frame.imageHeight,
              }));
            }
          }
        }
      } else {
        setStage("ocr");
        const optimized = await preprocessImage(file);
        const languages = chooseOcrLanguages(file.name);
        const ocr = await runOcr(
          [optimized.blob],
          (value) => setProgress(10 + Math.round(value * 65)),
          [file],
          languages,
        );
        ocrText = ocr.text;
        ocrConfidence = ocr.confidence;
        ocrUsed = true;
        for (const result of ocr.pages) {
          const words = parseTesseractTsv(result.tsv);
          positionedItems.push(...fromOcrWordBoxes(1, words, {
            pageWidth: optimized.width,
            pageHeight: optimized.height,
            imageWidth: optimized.width,
            imageHeight: optimized.height,
          }));
        }
      }

      const extractedText = [nativeText, ocrText].filter(Boolean).join("\n").trim();
      if (!extractedText) throw new Error("NO_TEXT");
      if (analysisExpired) throw new Error("ANALYSIS_TIMEOUT");

      setStage("resolving");
      setProgress(82);
      const manualZone = Number.parseInt(utmZoneInput, 10);
      const response = await fetch("/api/land/resolve", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || `image/${fileExtension(file)}`,
          sizeBytes: file.size,
          nativeText: extractedText,
          pages: capturedPages.length > 1 && !ocrUsed ? capturedPages : undefined,
          positionedItems: positionedItems.length ? compactPositionedItems(positionedItems) : undefined,
          ocrText: ocrUsed ? ocrText : undefined,
          ocrConfidence,
          countryCode: inferDocumentCountry(`${file.name}\n${extractedText}`),
          crsMode: crsMode === "auto" ? undefined : crsMode,
          utmZone: crsMode === "utm" && isSelectableZone(manualZone) ? manualZone : undefined,
          utmHemisphere: crsMode === "utm" ? utmHemisphereInput : undefined,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as ResolveResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || `HTTP_${response.status}`);
      if (analysisExpired) throw new Error("ANALYSIS_TIMEOUT");

      setAnalysis({
        result,
        extractedText,
        nativeText,
        ocrText,
        details: extractLandDetails(extractedText),
        ocrUsed,
        ocrConfidence,
        positionedItems: positionedItems.length ? compactPositionedItems(positionedItems) : undefined,
      });
      setDocumentPages(capturedPages);
      setProgress(100);
      setStage("done");
    } catch (error) {
      const code = analysisExpired || (error instanceof DOMException && error.name === "AbortError")
        ? "ANALYSIS_TIMEOUT"
        : error instanceof Error
          ? error.message
          : "ANALYSIS_FAILED";
      setErrorCode(code);
      setStage("error");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, [crsMode, file, utmHemisphereInput, utmZoneInput]);

  /**
   * Re-runs the analysis with the user's coordinate-system correction or the
   * coordinate group they picked. Nothing is re-read from the file: the text
   * captured by the first pass is reused.
   */
  const reanalyze = useCallback(async (overrides: {
    zone?: number;
    hemisphere?: "N" | "S";
    mode?: CrsMode;
    coordinateGroupId?: string;
    confirmedOrder?: number[];
  } = {}) => {
    if (!file || !analysis) return;
    const mode = overrides.mode ?? crsMode;
    const zone = overrides.zone ?? Number.parseInt(utmZoneInput, 10);
    const hemisphere = overrides.hemisphere ?? utmHemisphereInput;

    if (mode === "utm" && !isSelectableZone(zone)) {
      setActionError(t(
        "اختر نطاق UTM صالحًا من 1 إلى 60.",
        "Select a valid UTM zone from 1 to 60.",
        "1 ile 60 arasında geçerli bir UTM zonu seçin.",
      ));
      return;
    }

    setActionError("");
    setStage("resolving");
    setProgress(86);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/land/resolve", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || `image/${fileExtension(file)}`,
          sizeBytes: file.size,
          nativeText: analysis.nativeText || analysis.extractedText || undefined,
          pages: documentPages.length > 1 && !analysis.ocrUsed ? documentPages : undefined,
          ocrText: analysis.ocrText || undefined,
          ocrConfidence: analysis.ocrConfidence,
          positionedItems: analysis.positionedItems,
          countryCode: inferDocumentCountry(`${file.name}\n${analysis.extractedText}`),
          crsMode: mode === "auto" ? undefined : mode,
          utmZone: isSelectableZone(zone) ? zone : undefined,
          utmHemisphere: isSelectableZone(zone) ? hemisphere : undefined,
          coordinateGroupId: overrides.coordinateGroupId,
          confirmedOrder: overrides.confirmedOrder,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as ResolveResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || `HTTP_${response.status}`);
      setAnalysis((current) => current ? { ...current, result } : current);
      setProgress(100);
      setStage("done");
    } catch (error) {
      const message = error instanceof DOMException && error.name === "AbortError"
        ? t("انتهت مهلة تأكيد نظام الإحداثيات.", "Coordinate-system confirmation timed out.", "Koordinat sistemi onay süresi doldu.")
        : error instanceof Error
          ? error.message
          : "CRS_RESOLUTION_FAILED";
      setActionError(message);
      setStage("done");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, [analysis, crsMode, documentPages, file, t, utmHemisphereInput, utmZoneInput]);

  const resolveWithSelectedCrs = useCallback(() => {
    const zone = Number.parseInt(utmZoneInput, 10);
    if (!isSelectableZone(zone)) {
      setActionError(t(
        "اختر نطاق UTM صالحًا من 1 إلى 60.",
        "Select a valid UTM zone from 1 to 60.",
        "1 ile 60 arasında geçerli bir UTM zonu seçin.",
      ));
      return;
    }
    return reanalyze({ mode: "utm", zone, hemisphere: utmHemisphereInput });
  }, [reanalyze, t, utmHemisphereInput, utmZoneInput]);

  const coordinateRows = useMemo<CoordinateRow[]>(() => {
    if (!analysis) return [];
    const explicit = (analysis.result.evidence?.explicitCoordinates ?? []).filter(
      (item) => item.parsedLat != null && item.parsedLon != null,
    );
    if (explicit.length > 0) {
      return explicit.map((item, index) => {
        const lat = item.parsedLat as number;
        const lon = item.parsedLon as number;
        const raw = item.raw || item.text || `${lat}, ${lon}`;
        const vertex = analysis.result.parcel?.vertices?.[index];
        return {
          lat,
          lon,
          // Prefer the document's own point/LINE id.  Saudi Balady rows also
          // carry a trailing reference number that is more useful than P1/P2.
          label: vertex?.pointNumber ?? sourcePointLabel(raw, index),
          raw,
          crsHint: item.crsHint ?? "WGS84",
          latText: preciseDecimalFromRaw(raw, lat) ?? formatWgs84(lat),
          lonText: preciseDecimalFromRaw(raw, lon) ?? formatWgs84(lon),
        };
      });
    }

    const evidencePoints = analysis.result.evidence?.coordinatePairs ?? [];
    const geometry = analysis.result.geometry?.coordinates ?? [];
    const fallback = evidencePoints.length ? evidencePoints : geometry;
    return fallback.map((point, index) => ({
      ...point,
      label: `P${index + 1}`,
      raw: `${formatWgs84(point.lat)}, ${formatWgs84(point.lon)}`,
      crsHint: "WGS84",
      latText: formatWgs84(point.lat),
      lonText: formatWgs84(point.lon),
    }));
  }, [analysis]);

  // The source order is intentional. Survey documents can repeat a closing
  // point or contain a crossing sequence, and both must remain visible.
  const points = useMemo(
    () => coordinateRows.map(({ lat, lon }) => ({ lat, lon })),
    [coordinateRows],
  );

  // Source rows stay untouched in the tables.  Automatic geometry, however,
  // must never treat an exact repeated coordinate as a second parcel corner.
  const automaticGeometryPoints = useMemo(
    () => dedupeGeometryPoints(points),
    [points],
  );

  /**
   * All corners are projected into one shared UTM zone so a parcel near a zone
   * boundary is not reported on two different grids. The document's own zone
   * wins when it has one; otherwise the zone is derived from the parcel centre.
   */
  const utmProjection = useMemo(() => {
    if (points.length === 0) return null;
    if (points.some((point) => !isWithinUtmLatitudeBand(point.lat))) return null;
    const declaredZone = analysis?.result.crsSelection?.zone;
    const declaredHemisphere = analysis?.result.crsSelection?.hemisphere;
    return projectPointsToSharedUtm(points, {
      zone: declaredZone,
      hemisphere: declaredHemisphere as Hemisphere | undefined,
    });
  }, [analysis, points]);

  const utmRows = useMemo(() => {
    if (!utmProjection) return [];
    return utmProjection.rows.map((row, index) => ({
      label: coordinateRows[index]?.label ?? `P${index + 1}`,
      zone: utmProjection.zone,
      hemisphere: utmProjection.hemisphere,
      easting: row.easting,
      northing: row.northing,
    }));
  }, [coordinateRows, utmProjection]);

  const isOmanResult = useMemo(() => {
    if (!analysis) return false;
    if (analysis.result.documentIntelligence?.country.code === "OM") return true;
    return inferDocumentCountry(`${file?.name ?? ""}\n${analysis.extractedText}`) === "OM";
  }, [analysis, file]);

  // The first table must show the document values, not a second converted copy.
  // For projected cadastral drawings the resolver preserves Easting/Northing on
  // each source vertex.  The raw-row parser is only a fallback for older results.
  const sourceProjectedRows = useMemo(() => {
    if (!analysis) return [];
    const vertices = analysis.result.parcel?.vertices ?? [];
    const fromVertices = vertices.flatMap((vertex, index) => {
      const easting = vertex.original.easting;
      const northing = vertex.original.northing;
      if (typeof easting !== "number" || !Number.isFinite(easting)
        || typeof northing !== "number" || !Number.isFinite(northing)) return [];
      return [{
        label: vertex.pointNumber ?? coordinateRows[index]?.label ?? `P${index + 1}`,
        raw: vertex.sourceText,
        zone: vertex.original.zone,
        easting,
        northing,
      }];
    });
    if (fromVertices.length > 0) return fromVertices;
    return parseProjectedSourceRows(coordinateRows.map(({ label, raw }) => ({ label, raw })));
  }, [analysis, coordinateRows]);

  /**
   * A survey report is read to get working coordinates, and for a document
   * written in degrees those are the projected ones -- nobody sets out a
   * boundary from a decimal latitude. So when the document is geographic and a
   * projection is available, UTM opens first.
   *
   * A document that already carries eastings and northings is left on its own
   * tab: those ARE the working coordinates, and converting them to show
   * something "converted" would only move the user further from the paper in
   * their hand.
   *
   * The original values never go away -- provenance is the point of a survey
   * tool -- they are one click away, and any click pins the choice.
   */
  const coordinateView: "wgs84" | "utm" = useMemo(() => {
    if (coordinateViewOverride) return coordinateViewOverride;
    if (utmRows.length > 0 && sourceProjectedRows.length === 0) return "utm";
    return "wgs84";
  }, [coordinateViewOverride, sourceProjectedRows.length, utmRows.length]);


  const activeOmanZone = analysis?.result.crsSelection?.zone === 39 ? 39 : 40;
  const handleOmanZoneChange = useCallback((value: string) => {
    const zone = Number.parseInt(value, 10);
    if (zone !== 39 && zone !== 40) return;
    setUtmZoneInput(String(zone));
    setUtmHemisphereInput("N");
    setCrsMode("utm");
    // Reuses extracted text + positioned rows.  No PDF read and no OCR pass.
    void reanalyze({ mode: "utm", zone, hemisphere: "N" });
  }, [reanalyze]);

  const hasValidPolygon = analysis?.result.geometry?.type === "polygon";

  const area = useMemo(() => {
    const statedArea = Number.parseFloat(analysis?.details.area?.replace(/,/g, "") ?? "");
    if (Number.isFinite(statedArea) && statedArea > 0) {
      return { value: statedArea, source: "registered" as const };
    }
    const computedArea = hasValidPolygon ? polygonAreaSqm(automaticGeometryPoints) : null;
    return computedArea
      ? { value: computedArea, source: "geometry" as const }
      : { value: null, source: "unavailable" as const };
  }, [analysis, automaticGeometryPoints, hasValidPolygon]);

  /* ---- Manual Geometry Recovery derived state ---- */
  const sourcePointsData = useMemo<SourcePoint[]>(() => {
    return coordinateRows.map((row, i) => ({
      ...row,
      id: analysis?.result.parcel?.vertices?.[i]?.label ?? row.label,
      label: row.label,
      sourceIndex: i,
      confidence: analysis?.result.parcel?.vertices?.[i]?.confidence,
      page: analysis?.result.parcel?.vertices?.[i]?.page,
      rowIndex: analysis?.result.parcel?.vertices?.[i]?.rowIndex,
    }));
  }, [coordinateRows, analysis]);

  const srcPtsById = useMemo(
    () => new Map(sourcePointsData.map((sp) => [sp.id, sp])),
    [sourcePointsData],
  );

  // Initialize manual draft when analysis completes and panel should show.
  // Adjusted during render (React's documented pattern for deriving state
  // from a prop/state change) instead of in an effect, so this doesn't
  // trigger an extra cascading render pass.
  if (
    stage === "done" &&
    analysis &&
    manualDraft === null &&
    analysis !== manualDraftAnalysis &&
    shouldShowManualGeometry(
      coordinateRows.length,
      hasValidPolygon,
      analysis.result.status,
      analysis.result.parcel?.boundary.selfIntersections,
      analysis.result.parcel?.boundary.documentOrderValid,
    )
  ) {
    setManualDraftAnalysis(analysis);
    const initial = createInitialDraft(sourcePointsData);
    setManualDraft(initial);
    setManualHistory([initial]);
    setManualHistoryIdx(0);
  }

  const manualPreviewPoints = useMemo(
    () => manualDraft ? getPreviewPoints(manualDraft, srcPtsById) : [],
    [manualDraft, srcPtsById],
  );

  const manualValidation = useMemo<ValidationResult[]>(
    () => manualPreviewPoints.length > 0
      ? validateManualGeometry(manualPreviewPoints, !analysis?.result.crsSelection?.required)
      : [],
    [manualPreviewPoints, analysis],
  );

  const manualStatus = useMemo<GeometryStatus>(
    () => deriveGeometryStatus(manualValidation),
    [manualValidation],
  );

  const manualAreaSqm = useMemo(
    () => manualPreviewPoints.length >= 3 ? computePolygonArea(manualPreviewPoints) : null,
    [manualPreviewPoints],
  );

  const manualPerimeter = useMemo(
    () => manualPreviewPoints.length >= 2 ? computePerimeter(manualPreviewPoints) : null,
    [manualPreviewPoints],
  );

  const declaredAreaSqm = useMemo(() => {
    const raw = analysis?.details.area?.replace(/,/g, "");
    const v = raw ? Number.parseFloat(raw) : NaN;
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [analysis]);

  const hasExplicitTopology = (analysis?.result.parcel?.sequenceEvidence ?? "") !== "UNKNOWN"
    && (analysis?.result.parcel?.sequenceEvidence ?? "").length > 0;

  const showManualGeometryPanel = manualDraft !== null && stage === "done" && analysis !== null;

  const handleManualDraftChange = useCallback((draft: ManualDraft) => {
    setManualDraft(draft);
    const { history: h, historyIndex: idx } = pushHistory(manualHistory, manualHistoryIdx, draft);
    setManualHistory(h);
    setManualHistoryIdx(idx);
  }, [manualHistory, manualHistoryIdx]);

  const handleManualUndo = useCallback(() => {
    const result = undo(manualHistory, manualHistoryIdx);
    if (result) {
      setManualDraft(result.draft);
      setManualHistoryIdx(result.historyIndex);
    }
  }, [manualHistory, manualHistoryIdx]);

  const handleManualRedo = useCallback(() => {
    const result = redo(manualHistory, manualHistoryIdx);
    if (result) {
      setManualDraft(result.draft);
      setManualHistoryIdx(result.historyIndex);
    }
  }, [manualHistory, manualHistoryIdx]);

  const handleManualConfirm = useCallback((geometry: ConfirmedManualGeometry) => {
    setManualConfirmed(geometry);
  }, []);

  useEffect(() => {
    if (stage !== "done" || !analysis?.result.center || !mapRef.current) return;
    let cancelled = false;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !mapRef.current) return;
      mapRef.current.innerHTML = "";
      const center: [number, number] = [analysis.result.center!.lat, analysis.result.center!.lon];
      const map = leaflet.map(mapRef.current, { center, zoom: 17, zoomControl: true });
      mapInstanceRef.current = map;
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 22,
      }).addTo(map);

      const bounds: [number, number][] = [];
      // When manual geometry is active, draw the preview points in manual order
      const mapPreviewPoints = showManualGeometryPanel && manualPreviewPoints.length >= 2
        ? manualPreviewPoints
        : automaticGeometryPoints;
      const mapHasValidPoly = showManualGeometryPanel
        ? manualStatus === "VALID"
        : hasValidPolygon;
      if (mapHasValidPoly && mapPreviewPoints.length >= 3) {
        const polygon = mapPreviewPoints.map((point) => [point.lat, point.lon] as [number, number]);
        leaflet.polygon(polygon, {
          color: showManualGeometryPanel ? "#7c3aed" : "#1d4ed8",
          fillColor: showManualGeometryPanel ? "#8b5cf6" : "#3b82f6",
          fillOpacity: 0.15,
          weight: showManualGeometryPanel ? 2.5 : 3,
          dashArray: showManualGeometryPanel ? "6 4" : undefined,
          className: showManualGeometryPanel ? "fml-manual-preview" : undefined,
        }).addTo(map);
        bounds.push(...polygon);
      } else if (mapPreviewPoints.length >= 2) {
        const sequence = mapPreviewPoints.map((point) => [point.lat, point.lon] as [number, number]);
        leaflet.polyline(sequence, {
          color: showManualGeometryPanel ? "#7c3aed" : "#d97706",
          dashArray: "8 6",
          weight: 3,
        }).addTo(map);
        bounds.push(...sequence);
      } else {
        bounds.push(center);
      }
      // Draw numbered markers — manual order if active, source order otherwise
      mapPreviewPoints.forEach((point, index) => {
        const marker = leaflet.circleMarker([point.lat, point.lon], {
          radius: 7,
          color: showManualGeometryPanel ? "#7c3aed" : "#1d4ed8",
          fillColor: "#ffffff",
          fillOpacity: 1,
          weight: 3,
        });
        marker.bindTooltip(`${index + 1}`, {
          permanent: mapPreviewPoints.length <= 24,
          direction: "top",
          offset: [0, -8],
          className: showManualGeometryPanel ? "fml-manual-point-label" : "fml-point-label",
        }).addTo(map);
        if (showManualGeometryPanel) {
          marker.on("click", () => setHighlightedPointId(
            sourcePointsData.find((sp) => {
              const mp = manualDraft?.orderedIds[index];
              return mp === sp.id;
            })?.id ?? null,
          ));
        }
      });
      // Fitting the real bounds keeps small urban plots and large rural
      // parcels both readable, and never drops the user on a default location.
      const fitted = leaflet.latLngBounds(bounds).pad(0.22);
      map.fitBounds(fitted, { maxZoom: 19 });
      if (points.length < 2) map.setView(center, 17);
      window.setTimeout(() => map.invalidateSize(), 50);
    })();

    return () => {
      cancelled = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [analysis, automaticGeometryPoints, focusMode, hasValidPolygon, points, stage, t, showManualGeometryPanel, manualPreviewPoints, manualStatus, manualDraft, sourcePointsData]);

  const statusCopy = analysis
    ? STATUS_COPY[analysis.result.status]?.[locale] ?? analysis.result.status
    : "";
  const strategy = analysis?.result.strategy;
  const crsSelectionRequired = analysis?.result.crsSelection?.required === true;
  const groupSelectionRequired = analysis?.result.coordinateGroupSelectionRequired === true;
  const resultVerdict = crsSelectionRequired || groupSelectionRequired
    ? "review" as const
    : coordinateRows.length === 0
      ? "failed" as const
      : strategy?.requiresReview
      ? "review" as const
      : "confident" as const;
  const resultVerdictCopy = resultVerdict === "confident"
    ? t("تم التحليل بنجاح", "Analysis completed successfully", "Analiz başarıyla tamamlandı")
    : resultVerdict === "review"
      ? t("تحتاج الإحداثيات إلى مراجعة", "Coordinates need review", "Koordinatlar incelenmeli")
      : t("تعذر استخراج إحداثيات صالحة", "No valid coordinates could be extracted", "Geçerli koordinatlar çıkarılamadı");
  const googleMapsUrl = coordinateRows.length > 0 && analysis?.result.center
    ? `https://www.google.com/maps/search/?api=1&query=${analysis.result.center.lat},${analysis.result.center.lon}`
    : "";

  const crsLabel = crsSelectionRequired
    ? t("بانتظار اختيار UTM", "Awaiting UTM choice", "UTM seçimi bekleniyor")
    : analysis?.result.crsSelection?.zone && analysis.result.crsSelection.hemisphere
      ? `UTM ${formatUtmZone(analysis.result.crsSelection.zone, analysis.result.crsSelection.hemisphere)} → WGS84`
      : "WGS84";
  const crsEpsgLabel = analysis?.result.crsSelection?.epsg
    ? `EPSG:${analysis.result.crsSelection.epsg}`
    : coordinateRows.length > 0
      ? "EPSG:4326"
      : "";

  const copyText = useCallback(async (
    text: string,
    target: "wgs" | "utm" | "all" | "share" | "export",
  ) => {
    await writeClipboard(text);
    setCopiedTarget(target);
    window.setTimeout(() => setCopiedTarget((current) => (current === target ? null : current)), 1800);
  }, []);

  // Copy and export keep the full stored precision; only the on-screen table
  // is allowed to shorten a value.
  const wgsClipboardText = useMemo(() => [
    "Point\tLatitude (N)\tLongitude (E)\tCRS",
    ...coordinateRows.map((point) => `${point.label}\t${point.latText}\t${point.lonText}\tWGS84`),
  ].join("\n"), [coordinateRows]);

  const utmClipboardText = useMemo(() => [
    "Point\tUTM Zone\tEPSG\tEasting (X)\tNorthing (Y)",
    ...utmRows.map((point) => `${point.label}\t${formatUtmZone(point.zone, point.hemisphere)}\t${utmEpsgCode(point.zone, point.hemisphere)}\t${point.easting.toFixed(3)}\t${point.northing.toFixed(3)}`),
  ].join("\n"), [utmRows]);

  const locationShareText = useMemo(() => [
    t("موقع الأرض من أداة حدّد أرضك", "Land location from Map My Deed", "Tapumu Haritala konumu"),
    analysis?.result.center
      ? `${formatWgs84(analysis.result.center.lat)}, ${formatWgs84(analysis.result.center.lon)}`
      : "",
    googleMapsUrl,
  ].filter(Boolean).join("\n"), [analysis, googleMapsUrl, t]);
  const whatsappShareUrl = googleMapsUrl
    ? `https://wa.me/?text=${encodeURIComponent(locationShareText)}`
    : "";

  /**
   * The whole analysis as structured data: the corners in both systems, the
   * order the document gave and the order in force, the measurements, and the
   * warnings. Enough for a surveyor to carry the result into another tool.
   */
  const exportPayload = useMemo(() => {
    if (!analysis) return null;
    const result = analysis.result;
    return {
      tool: "akarpromax.find-my-land",
      version: 1,
      generatedAt: new Date().toISOString(),
      disclaimer: "Automated analysis for review. It does not replace the official document.",
      document: {
        country: result.documentIntelligence?.country.code ?? "UNKNOWN",
        countryConfidence: result.documentIntelligence?.country.level ?? "UNKNOWN",
        type: result.documentIntelligence?.documentType.kind ?? "UNKNOWN_SURVEY_DOCUMENT",
        pageCount: result.documentIntelligence?.pageCount ?? 1,
      },
      crs: {
        geographic: "EPSG:4326",
        projected: result.crsSelection?.epsg ? `EPSG:${result.crsSelection.epsg}` : null,
        zone: result.crsSelection?.zone ?? null,
        hemisphere: result.crsSelection?.hemisphere ?? null,
        source: result.crsSelection?.source ?? "NONE",
      },
      sequence: {
        evidence: result.parcel?.sequenceEvidence ?? null,
        documentOrder: result.parcel?.vertices.map((vertex) => vertex.pointNumber ?? vertex.label) ?? [],
        confirmedByUser: result.parcel?.orderConfirmedByUser ?? false,
        closed: result.parcel?.closedByTopology ?? false,
      },
      wgs84: coordinateRows.map((row) => ({ point: row.label, latitude: row.latText, longitude: row.lonText })),
      utm: utmRows.map((row) => ({
        point: row.label,
        zone: formatUtmZone(row.zone, row.hemisphere),
        epsg: utmEpsgCode(row.zone, row.hemisphere),
        easting: Number(row.easting.toFixed(3)),
        northing: Number(row.northing.toFixed(3)),
      })),
      measurements: {
        areaSquareMeters: result.parcel?.boundary.areaSquareMeters ?? null,
        registeredAreaSquareMeters: result.parcel?.documented.area?.squareMeters ?? null,
        perimeterMeters: result.parcel?.boundary.perimeterMeters ?? null,
        segments: result.parcel?.boundary.segments.map((segment) => ({
          from: segment.fromLabel,
          to: segment.toLabel,
          calculatedMeters: Number(segment.lengthMeters.toFixed(3)),
          documentMeters: segment.documentLengthMeters ?? null,
          bearingDegrees: Number(segment.bearingDegrees.toFixed(2)),
        })) ?? [],
      },
      warnings: [...new Set((result.warnings ?? []).map((warning) => translatedWarning(warning, locale)))],
    };
  }, [analysis, coordinateRows, locale, utmRows]);

  const copyExport = useCallback(async () => {
    if (!exportPayload) return;
    await copyText(JSON.stringify(exportPayload, null, 2), "export");
  }, [copyText, exportPayload]);

  const copySummary = useCallback(async () => {
    if (!analysis) return;
    const lines = [
      t("موقع الأرض", "Land location", "Arazi konumu"),
      wgsClipboardText,
      ...(utmRows.length ? ["", utmClipboardText] : []),
      "",
      googleMapsUrl,
    ].filter(Boolean);
    await copyText(lines.join("\n"), "all");
  }, [analysis, copyText, googleMapsUrl, t, utmClipboardText, utmRows.length, wgsClipboardText]);

  const shareToMessenger = useCallback(async () => {
    if (!googleMapsUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("موقع الأرض", "Land location", "Arazi konumu"),
          text: locationShareText,
          url: googleMapsUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyText(locationShareText, "share");
    window.open("https://www.messenger.com/", "_blank", "noopener,noreferrer");
  }, [copyText, googleMapsUrl, locationShareText, t]);

  const errorMessage = errorCode === "FILE_TYPE"
    ? t("الملفات المدعومة: PDF وPNG وJPG وJFIF وWEBP فقط.", "Supported files: PDF, PNG, JPG, JFIF, and WEBP.", "Desteklenen dosyalar: PDF, PNG, JPG, JFIF ve WEBP.")
    : errorCode === "FILE_SIZE"
      ? t("حجم الملف يتجاوز 20 ميجابايت.", "The file exceeds the 20 MB limit.", "Dosya 20 MB sınırını aşıyor.")
      : errorCode === "NO_TEXT"
        ? t("لم نتمكن من قراءة نص واضح من الملف. جرّب صورة مستقيمة وعالية الدقة.", "No clear text could be read. Try a straight, high-resolution image.", "Dosyadan net metin okunamadı. Düz ve yüksek çözünürlüklü bir görsel deneyin.")
        : errorCode === "ANALYSIS_TIMEOUT"
          ? t("استغرق التحليل أكثر من دقيقة فتوقف بأمان. جرّب ملفًا أصغر أو أوضح.", "Analysis exceeded one minute and stopped safely. Try a smaller or clearer file.", "Analiz bir dakikayı aştığı için güvenle durduruldu. Daha küçük veya daha net bir dosya deneyin.")
        : t("تعذر إكمال التحليل. جرّب الملف مرة أخرى أو استخدم نسخة أوضح.", "Analysis could not be completed. Try again or use a clearer copy.", "Analiz tamamlanamadı. Yeniden deneyin veya daha net bir kopya kullanın.");

  const stageLabel: Record<Stage, string> = {
    idle: "",
    ready: "",
    reading: t("قراءة صفحات الوثيقة…", "Reading document pages…", "Belge sayfaları okunuyor…"),
    ocr: t("تحسين الصورة والتعرّف على النص العربي…", "Enhancing the image and reading Arabic text…", "Görsel iyileştiriliyor ve Arapça metin okunuyor…"),
    resolving: t("استخراج البيانات والإحداثيات ورسم الحدود…", "Extracting data, coordinates, and boundaries…", "Veriler, koordinatlar ve sınırlar çıkarılıyor…"),
    done: "",
    error: "",
  };

  const zoneOptions = useMemo(
    () => Array.from({ length: UTM_ZONE_MAX - UTM_ZONE_MIN + 1 }, (_, index) => index + UTM_ZONE_MIN),
    [],
  );

  const crsControls = (
    <div className="fml-crs-controls" data-crs-override>
      <label className="fml-field">
        <span className="fml-field-label">{t("نظام الإحداثيات", "Coordinate system", "Koordinat sistemi")}</span>
        <select
          value={crsMode}
          onChange={(event) => setCrsMode(event.target.value as CrsMode)}
          className="fml-select"
          aria-label={t("نظام الإحداثيات", "Coordinate system", "Koordinat sistemi")}
        >
          <option value="auto">{t("تحديد تلقائي", "Detect automatically", "Otomatik belirle")}</option>
          <option value="wgs84">WGS84 (Lat/Lng)</option>
          <option value="utm">UTM</option>
        </select>
      </label>
      {crsMode === "utm" && (
        <>
          <label className="fml-field">
            <span className="fml-field-label">Zone</span>
            <select
              value={utmZoneInput}
              onChange={(event) => setUtmZoneInput(event.target.value)}
              className="fml-select"
              aria-label="UTM Zone"
            >
              <option value="">{t("اختر النطاق", "Select zone", "Zon seçin")}</option>
              {zoneOptions.map((zone) => <option key={zone} value={zone}>Zone {zone}</option>)}
            </select>
          </label>
          <label className="fml-field">
            <span className="fml-field-label">{t("نصف الكرة", "Hemisphere", "Yarımküre")}</span>
            <select
              value={utmHemisphereInput}
              onChange={(event) => setUtmHemisphereInput(event.target.value as "N" | "S")}
              className="fml-select"
              aria-label={t("نصف الكرة UTM", "UTM hemisphere", "UTM yarımküresi")}
            >
              <option value="N">N — {t("شمالي", "North", "Kuzey")}</option>
              <option value="S">S — {t("جنوبي", "South", "Güney")}</option>
            </select>
          </label>
        </>
      )}
    </div>
  );

  return (
    <ToolCalculatorShell
      title={t("حدّد أرضك", "Map My Deed", "Tapumu Haritala")}
      subtitle={t(
        "ارفع الكروكي أو ملف PDF لاستخراج الإحداثيات ورسم حدود الأرض.",
        "Upload a survey plan or PDF to extract coordinates and draw the land boundary.",
        "Koordinatları çıkarmak ve sınırı çizmek için planı veya PDF'i yükleyin.",
      )}
      dir={dir}
    >
      <div className={`fml-root${focusMode ? " fml-root--focus" : ""}`} data-find-my-land>

        {/* ===== EMPTY / READY / ERROR ===== */}
        {(stage === "idle" || stage === "ready" || stage === "error") && !analysis && (
          <section className="fml-stage">
            <button
              type="button"
              className={`fml-dropzone${dragging ? " is-dragging" : ""}${file ? " has-file" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const dropped = event.dataTransfer.files?.[0];
                if (dropped) selectFile(dropped);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.jfif,.webp,application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) selectFile(selected);
                }}
              />
              <span className="fml-dropzone-badge">
                <Sparkles size={13} strokeWidth={2} />
                {t("تحليل ذكي", "Smart analysis", "Akıllı analiz")}
              </span>
              <span className="fml-dropzone-icon">
                <UploadCloud size={30} strokeWidth={1.7} />
              </span>
              <strong className="fml-dropzone-title">
                {dragging
                  ? t("أفلت الملف هنا", "Drop the file here", "Dosyayı buraya bırakın")
                  : t("اسحب الكروكي أو الملف هنا", "Drag the survey plan or file here", "Planı veya dosyayı buraya sürükleyin")}
              </strong>
              <span className="fml-dropzone-sub">
                {t("أو اختر ملفًا من جهازك", "or choose a file from your device", "veya cihazınızdan bir dosya seçin")}
              </span>
              <span className="fml-dropzone-formats">
                PDF · PNG · JPG · JFIF · WEBP — {t("حتى 20 MB", "up to 20 MB", "20 MB'a kadar")}
              </span>
            </button>

            {file && (
              <div className="fml-file-row">
                <span className="fml-file-icon"><FileText size={19} /></span>
                <div className="fml-file-meta">
                  <p className="fml-file-name">{file.name}</p>
                  <p className="fml-file-size">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); reset(); }}
                  className="fml-file-clear"
                  aria-label={t("إزالة الملف", "Remove file", "Dosyayı kaldır")}
                >
                  <X size={16} />
                </button>
                <button type="button" onClick={analyze} className="fml-primary-btn">
                  <ScanLine size={17} />
                  {t("ابدأ التحليل", "Start analysis", "Analizi başlat")}
                </button>
              </div>
            )}

            {stage === "error" && (
              <div className="fml-alert fml-alert--error" role="alert">
                <AlertTriangle size={17} />
                <span>{errorMessage}</span>
                <button type="button" onClick={reset} className="fml-inline-btn">
                  <RotateCcw size={14} />
                  {t("إعادة المحاولة", "Try again", "Yeniden dene")}
                </button>
              </div>
            )}

            <ul className="fml-highlights">
              <li><CheckCircle2 size={15} />{t("استخراج الإحداثيات.", "Extract the coordinates.", "Koordinatları çıkarır.")}</li>
              <li><CheckCircle2 size={15} />{t("تحويل WGS84 / UTM.", "Convert WGS84 / UTM.", "WGS84 / UTM dönüştürür.")}</li>
              <li><CheckCircle2 size={15} />{t("رسم حدود الأرض على الخريطة.", "Draw the boundary on the map.", "Sınırı haritada çizer.")}</li>
            </ul>

            <details className="fml-advanced">
              <summary>{t("نظام الإحداثيات (اختياري)", "Coordinate system (optional)", "Koordinat sistemi (isteğe bağlı)")}</summary>
              <div className="fml-advanced-body">
                <p className="fml-hint">
                  {t(
                    "اتركه على «تحديد تلقائي» ما لم يكن المستند غير واضح. يدعم النظام جميع نطاقات UTM من 1 إلى 60 في نصفي الكرة.",
                    "Leave it on automatic unless the document is unclear. All UTM zones 1–60 are supported in both hemispheres.",
                    "Belge belirsiz değilse otomatik bırakın. Her iki yarımkürede 1–60 arası tüm UTM zonları desteklenir.",
                  )}
                </p>
                {crsControls}
              </div>
            </details>

            {file && previewUrl && (
              <details className="fml-advanced">
                <summary>{t("معاينة الملف", "File preview", "Dosya önizleme")}</summary>
                <div className="fml-preview">
                  {fileExtension(file) === "pdf" ? (
                    <object data={previewUrl} type="application/pdf" className="fml-preview-frame">
                      <div className="fml-preview-fallback">
                        {t("تم اختيار ملف PDF وهو جاهز للتحليل.", "The PDF is ready for analysis.", "PDF analize hazır.")}
                      </div>
                    </object>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={file.name} className="fml-preview-frame" />
                  )}
                </div>
              </details>
            )}
          </section>
        )}

        {/* ===== PROCESSING ===== */}
        {(stage === "reading" || stage === "ocr" || stage === "resolving") && (
          <section className="fml-processing">
            <span className="fml-processing-icon">
              <ScanLine className="animate-pulse" size={30} />
            </span>
            <h3 className="fml-processing-title">{stageLabel[stage]}</h3>
            <p className="fml-processing-sub">
              {t("قد يستغرق OCR وقتًا أطول للصور الكبيرة أو ملفات PDF الممسوحة.", "OCR can take longer for large images or scanned PDFs.", "OCR, büyük görseller veya taranmış PDF'lerde daha uzun sürebilir.")}
            </p>
            <div className="fml-progress">
              <div className="fml-progress-track">
                <div className="fml-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="fml-progress-value">{progress}%</div>
            </div>
          </section>
        )}

        {/* ===== RESULTS ===== */}
        {stage === "done" && analysis && (
          <div className="fml-results">

            <section className={`fml-verdict fml-verdict--${resultVerdict}`}>
              <span className="fml-verdict-icon">
                {resultVerdict === "confident" ? <CheckCircle2 size={22} /> : <AlertTriangle size={21} />}
              </span>
              <div className="fml-verdict-text">
                <h3>{resultVerdictCopy}</h3>
                {resultVerdict !== "confident" && <p>{statusCopy}</p>}
              </div>
              <div className="fml-verdict-actions">
                <button
                  type="button"
                  onClick={() => setFocusMode((current) => !current)}
                  className="fml-ghost-btn"
                  aria-pressed={focusMode}
                >
                  {focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  {focusMode
                    ? t("إنهاء وضع التركيز", "Exit focus mode", "Odak modundan çık")
                    : t("وضع التركيز", "Focus mode", "Odak modu")}
                </button>
                <button type="button" onClick={reset} className="fml-ghost-btn">
                  <RotateCcw size={15} />
                  {t("إعادة التحليل", "Analyze again", "Yeniden analiz et")}
                </button>
              </div>
            </section>

            {/* --- CRS selection required --- */}
            {crsSelectionRequired && (
              <section className="fml-panel fml-panel--warning" data-utm-selection-required>
                <div className="fml-panel-head">
                  <AlertTriangle size={19} />
                  <div>
                    <h3>{t("حدد منطقة UTM لإكمال التحويل", "Select the UTM zone to finish the conversion", "Dönüşümü tamamlamak için UTM zonunu seçin")}</h3>
                    <p>
                      {t(
                        "الوثيقة تحتوي جدول Easting/Northing، لكنها لا تذكر نطاق UTM أو نصف الكرة. لن نخمّن الموقع.",
                        "The document contains an Easting/Northing table but does not state the UTM zone or hemisphere. The location will not be guessed.",
                        "Belgede Easting/Northing tablosu var ancak UTM zonu veya yarımküre belirtilmemiş. Konum tahmin edilmeyecek.",
                      )}
                    </p>
                  </div>
                </div>
                <div className="fml-panel-controls">
                  <label className="fml-field">
                    <span className="fml-field-label">UTM Zone</span>
                    <select
                      value={utmZoneInput}
                      onChange={(event) => setUtmZoneInput(event.target.value)}
                      className="fml-select"
                      aria-label="UTM Zone"
                    >
                      <option value="">{t("اختر النطاق", "Select zone", "Zon seçin")}</option>
                      {zoneOptions.map((zone) => <option key={zone} value={zone}>Zone {zone}</option>)}
                    </select>
                  </label>
                  <label className="fml-field">
                    <span className="fml-field-label">{t("نصف الكرة", "Hemisphere", "Yarımküre")}</span>
                    <select
                      value={utmHemisphereInput}
                      onChange={(event) => setUtmHemisphereInput(event.target.value as "N" | "S")}
                      className="fml-select"
                      aria-label={t("نصف الكرة UTM", "UTM hemisphere", "UTM yarımküresi")}
                    >
                      <option value="N">N — {t("شمالي", "North", "Kuzey")}</option>
                      <option value="S">S — {t("جنوبي", "South", "Güney")}</option>
                    </select>
                  </label>
                  <button type="button" onClick={resolveWithSelectedCrs} className="fml-primary-btn">
                    {t("تأكيد والتحويل", "Confirm and convert", "Onayla ve dönüştür")}
                  </button>
                </div>
                {actionError && <p className="fml-error-text" role="alert">{actionError}</p>}
              </section>
            )}

            {/* --- Coordinate group selection --- */}
            {groupSelectionRequired && (analysis.result.coordinateGroups?.length ?? 0) > 1 && (
              <section className="fml-panel fml-panel--warning" data-coordinate-group-selection>
                <div className="fml-panel-head">
                  <Layers size={19} />
                  <div>
                    <h3>{t("المستند يحتوي أكثر من مجموعة إحداثيات", "The document contains more than one coordinate group", "Belge birden fazla koordinat grubu içeriyor")}</h3>
                    <p>
                      {t(
                        "اختر المجموعة التي تخص أرضك. لن نخلط المجموعات معًا.",
                        "Choose the group that belongs to your land. The groups are never merged.",
                        "Arazinize ait grubu seçin. Gruplar asla birleştirilmez.",
                      )}
                    </p>
                  </div>
                </div>
                <div className="fml-group-list">
                  {analysis.result.coordinateGroups?.map((group, index) => (
                    <button
                      key={group.id}
                      type="button"
                      className="fml-group-option"
                      onClick={() => reanalyze({ coordinateGroupId: group.id })}
                    >
                      <span className="fml-group-title">
                        {t("مجموعة", "Group", "Grup")} {index + 1} · {group.pointCount} {t("نقطة", "points", "nokta")}
                      </span>
                      <span className="fml-group-center">
                        {group.center.lat.toFixed(5)}, {group.center.lon.toFixed(5)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* --- What the document is --- */}
            {analysis.result.documentIntelligence && (
              <section className="fml-doc-summary" data-document-intelligence hidden>
                <div className="fml-doc-item">
                  <span className="fml-doc-label">{t("الدولة", "Country", "Ülke")}</span>
                  <span className="fml-doc-value">
                    {analysis.result.documentIntelligence.country.code === "UNKNOWN"
                      ? t("غير محددة", "Undetermined", "Belirsiz")
                      : locale === "ar"
                        ? analysis.result.documentIntelligence.country.label.ar
                        : analysis.result.documentIntelligence.country.label.en}
                    <em>{confidenceLevelCopy(analysis.result.documentIntelligence.country.level, locale)}</em>
                  </span>
                </div>
                <div className="fml-doc-item">
                  <span className="fml-doc-label">{t("نوع المستند", "Document type", "Belge türü")}</span>
                  <span className="fml-doc-value">
                    {DOCUMENT_KIND_COPY[analysis.result.documentIntelligence.documentType.kind]?.[locale]
                      ?? analysis.result.documentIntelligence.documentType.kind}
                    <em>{confidenceLevelCopy(analysis.result.documentIntelligence.documentType.level, locale)}</em>
                  </span>
                </div>
                {analysis.result.parcel && (
                  <div className="fml-doc-item">
                    <span className="fml-doc-label">{t("ترتيب النقاط", "Corner order", "Köşe sırası")}</span>
                    <span className="fml-doc-value">
                      {SEQUENCE_EVIDENCE_COPY[analysis.result.parcel.sequenceEvidence]?.[locale]
                        ?? analysis.result.parcel.sequenceEvidence}
                      {analysis.result.parcel.orderConfirmedByUser && (
                        <em>{t("بتأكيدك", "Confirmed by you", "Sizin onayınızla")}</em>
                      )}
                    </span>
                  </div>
                )}
                <div className="fml-doc-item">
                  <span className="fml-doc-label">{t("حالة الحدود", "Boundary state", "Sınır durumu")}</span>
                  <span className="fml-doc-value">
                    {analysis.result.parcel?.boundary.documentOrderValid
                      ? t("صالحة", "Valid", "Geçerli")
                      : t("تحتاج مراجعة", "Needs review", "İnceleme gerekir")}
                    {analysis.result.parcel?.closedByTopology && (
                      <em>{t("مغلقة", "Closed", "Kapalı")}</em>
                    )}
                  </span>
                </div>
              </section>
            )}

            {/* --- Summary --- */}
            <section className="fml-summary">
              <div className="fml-summary-card">
                <p className="fml-summary-label">{t("نقاط الحدود", "Boundary points", "Sınır noktaları")}</p>
                <p className="fml-summary-value">{points.length || "—"}</p>
              </div>
              <div className="fml-summary-card">
                <p className="fml-summary-label">{t("نظام الإحداثيات", "Coordinate system", "Koordinat sistemi")}</p>
                <p className="fml-summary-value fml-summary-value--sm">{crsLabel}</p>
                {crsEpsgLabel && <p className="fml-summary-note">{crsEpsgLabel}</p>}
              </div>
              <div className="fml-summary-card">
                <p className="fml-summary-label">{t("نطاق UTM", "UTM zone", "UTM zonu")}</p>
                <p className="fml-summary-value fml-summary-value--sm">
                  {analysis.result.utmOutOfRange
                    ? t("خارج نطاق UTM", "Outside UTM range", "UTM aralığı dışında")
                    : utmRows.length
                      ? formatUtmZone(utmRows[0].zone, utmRows[0].hemisphere)
                      : "—"}
                </p>
              </div>
              <div className="fml-summary-card">
                <p className="fml-summary-label">
                  {area.source === "registered"
                    ? t("المساحة المسجلة", "Registered area", "Kayıtlı alan")
                    : area.source === "geometry"
                      ? t("المساحة التقديرية", "Estimated area", "Tahmini alan")
                      : t("المساحة", "Area", "Alan")}
                </p>
                <p className="fml-summary-value">
                  {area.value ? area.value.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 2 }) : "—"}
                  {area.value ? <span className="fml-summary-unit">م²</span> : null}
                </p>
              </div>
            </section>

            {/* --- MAP --- */}
            <section className="fml-map-card">
              <div className="fml-map-head">
                <div className="fml-map-title">
                  <MapPin size={17} />
                  <h3>{t("رسم القطعة على الخريطة", "Parcel on map", "Parsel haritası")}</h3>
                </div>
              </div>
              {coordinateRows.length > 0 && analysis.result.center ? (
                <div ref={mapRef} className="fml-map" aria-label={t("خريطة موقع الأرض", "Land map", "Arazi haritası")} />
              ) : (
                <div className="fml-map-empty">
                  <MapPin size={34} />
                  <p>{t("لا توجد إحداثيات كافية للرسم.", "There are not enough coordinates to draw the parcel.", "Parseli çizmek için yeterli koordinat yok.")}</p>
                </div>
              )}
            </section>

            {analysis.result.utmOutOfRange && (
              <div className="fml-alert fml-alert--info">
                <Globe2 size={17} />
                <span>{t(
                  "الموقع خارج النطاق القياسي لنظام UTM؛ عُرضت الإحداثيات بنظام WGS84 فقط.",
                  "The location is outside the standard UTM range, so only WGS84 coordinates are shown.",
                  "Konum standart UTM aralığının dışında; yalnızca WGS84 koordinatları gösterildi.",
                )}</span>
              </div>
            )}

            {/* --- Area against the document --- */}
            {analysis.result.parcel?.boundary.areaComparison && (
              <section
                className={`fml-area-check fml-area-check--${analysis.result.parcel.boundary.areaComparison.verdict.toLowerCase()}`}
                data-area-comparison
                hidden
              >
                <div>
                  <span className="fml-area-label">{t("المساحة المحسوبة", "Calculated area", "Hesaplanan alan")}</span>
                  <strong>{formatMeters(analysis.result.parcel.boundary.areaComparison.computedSquareMeters, locale)} م²</strong>
                </div>
                <div>
                  <span className="fml-area-label">{t("المساحة المسجلة", "Registered area", "Kayıtlı alan")}</span>
                  <strong>{formatMeters(analysis.result.parcel.boundary.areaComparison.statedSquareMeters, locale)} م²</strong>
                </div>
                <div>
                  <span className="fml-area-label">{t("الفرق", "Difference", "Fark")}</span>
                  <strong>
                    {formatMeters(Math.abs(analysis.result.parcel.boundary.areaComparison.differenceSquareMeters), locale)} م²
                    {" "}
                    <em>({analysis.result.parcel.boundary.areaComparison.differencePercent.toFixed(2)}%)</em>
                  </strong>
                </div>
                <span className="fml-area-verdict">
                  {areaVerdictCopy(analysis.result.parcel.boundary.areaComparison.verdict, locale)}
                </span>
              </section>
            )}

            {/* --- Suggested corner order, offered not applied --- */}
            {analysis.result.parcel?.boundary.suggestedSequence && (
              <section className="fml-panel fml-panel--warning" data-suggested-sequence hidden>
                <div className="fml-panel-head">
                  <Layers size={19} />
                  <div>
                    <h3>{t("تم العثور على ترتيب محتمل للحدود", "A possible boundary order was found", "Olası bir sınır sırası bulundu")}</h3>
                    <p>
                      {t(
                        "ترتيب النقاط في المستند ينتج حدودًا متقاطعة. هذا ترتيب مقترح يحتاج تأكيدك — لن نطبّقه تلقائيًا.",
                        "The document's corner order produces a crossing boundary. This is a proposal that needs your confirmation; it is not applied automatically.",
                        "Belgedeki köşe sırası kesişen bir sınır üretiyor. Bu, onayınızı gerektiren bir öneridir; otomatik uygulanmaz.",
                      )}
                    </p>
                  </div>
                </div>
                <p className="fml-hint">
                  {t("الترتيب المقترح", "Proposed order", "Önerilen sıra")}:{" "}
                  {analysis.result.parcel.boundary.suggestedSequence.order
                    .map((index) => analysis.result.parcel?.vertices.find((vertex) => vertex.index === index)?.label ?? `P${index + 1}`)
                    .join(" → ")}
                  {" · "}
                  {t("المساحة", "Area", "Alan")}{" "}
                  {formatMeters(analysis.result.parcel.boundary.suggestedSequence.areaSquareMeters, locale)} م²
                </p>
                <button
                  type="button"
                  className="fml-primary-btn"
                  onClick={() => reanalyze({ confirmedOrder: analysis.result.parcel?.boundary.suggestedSequence?.order })}
                >
                  <CheckCircle2 size={16} />
                  {t("اعتماد الترتيب المقترح", "Accept the proposed order", "Önerilen sırayı kabul et")}
                </button>
              </section>
            )}

            {/* --- Manual Geometry Recovery --- */}
            {showManualGeometryPanel && manualDraft && (
              <ManualGeometryPanel
                locale={locale}
                sourcePoints={sourcePointsData}
                draft={manualDraft}
                onDraftChange={handleManualDraftChange}
                previewPoints={manualPreviewPoints}
                validation={manualValidation}
                status={manualStatus}
                areaSqm={manualAreaSqm}
                perimeterMeters={manualPerimeter}
                declaredAreaSqm={declaredAreaSqm}
                hasCrs={!analysis.result.crsSelection?.required}
                hasExplicitTopology={hasExplicitTopology}
                confirmed={manualConfirmed}
                onConfirm={handleManualConfirm}
                highlightedPointId={highlightedPointId}
                onHighlightPoint={setHighlightedPointId}
                canUndo={manualHistoryIdx > 0}
                canRedo={manualHistoryIdx < manualHistory.length - 1}
                onUndo={handleManualUndo}
                onRedo={handleManualRedo}
              />
            )}

            {/* --- COORDINATES (WGS84/original document view switches with UTM, they don't stack) --- */}
            {coordinateRows.length > 0 && (
              <section className="fml-coords">
                <div className="fml-coords-head">
                  <div className="fml-coords-title">
                    <Navigation size={16} />
                    <h3>
                      {coordinateView === "wgs84"
                        ? t("الإحداثيات الأصلية (من المستند)", "Original coordinates (from document)", "Özgün koordinatlar (belgeden)")
                        : t("إحداثيات ماركيتور العالمي (UTM)", "Universal Transverse Mercator coordinates (UTM)", "UTM koordinatları")}
                    </h3>
                  </div>
                  {utmRows.length > 0 && (
                    <div role="tablist" className="fml-coords-tabs" aria-label={t("عرض الإحداثيات", "Coordinate view", "Koordinat görünümü")}>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={coordinateView === "wgs84"}
                        className={`fml-tab${coordinateView === "wgs84" ? " fml-tab--active" : ""}`}
                        onClick={() => setCoordinateViewOverride("wgs84")}
                      >
                        {t("الأصلية", "Original", "Özgün")}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={coordinateView === "utm"}
                        className={`fml-tab${coordinateView === "utm" ? " fml-tab--active" : ""}`}
                        onClick={() => setCoordinateViewOverride("utm")}
                      >
                        UTM
                      </button>
                    </div>
                  )}
                  {coordinateView === "utm" && isOmanResult && sourceProjectedRows.length > 0 && (
                    <label className="fml-field" style={{ minWidth: 132 }}>
                      <span className="fml-field-label">UTM Zone</span>
                      <select
                        className="fml-select"
                        value={String(activeOmanZone)}
                        onChange={(event) => handleOmanZoneChange(event.target.value)}
                        aria-label={t("نطاق UTM لعمان", "Oman UTM zone", "Umman UTM zonu")}
                      >
                        <option value="40">40N</option>
                        <option value="39">39N</option>
                      </select>
                    </label>
                  )}
                </div>
                <div className="fml-table-wrap">
                  {coordinateView === "wgs84" ? (
                    sourceProjectedRows.length > 0 ? (
                      <table className="fml-table" dir="ltr">
                        <thead>
                          <tr>
                            <th># / LINE</th>
                            <th>X / Easting</th>
                            <th>Y / Northing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sourceProjectedRows.map((point, index) => (
                            <tr key={`${point.label}-${index}`}>
                              <td className="fml-cell-label">{point.label}</td>
                              <td className="fml-cell-lat select-all">{point.easting.toFixed(3)}</td>
                              <td className="fml-cell-lon select-all">{point.northing.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="fml-table" dir="ltr">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>N / Latitude</th>
                            <th>E / Longitude</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coordinateRows.map((point, index) => (
                            <tr key={`${point.label}-${index}`}>
                              <td className="fml-cell-label">{point.label}</td>
                              <td className="fml-cell-lat select-all">{point.latText}</td>
                              <td className="fml-cell-lon select-all">{point.lonText}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  ) : (
                    <table className="fml-table" dir="ltr">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Zone</th>
                          <th>X / Easting</th>
                          <th>Y / Northing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {utmRows.map((point, index) => (
                          <tr key={`${point.label}-${index}`}>
                            <td className="fml-cell-label">{point.label}</td>
                            <td>{formatUtmZone(point.zone, point.hemisphere)}</td>
                            <td className="fml-cell-lat select-all">{point.easting.toFixed(3)}</td>
                            <td className="fml-cell-lon select-all">{point.northing.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}

            {coordinateRows.length > 0 && (
              <div className="fml-actions">
                {googleMapsUrl && (
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="fml-action fml-action--primary">
                    <ExternalLink size={16} />
                    {t("Google Maps", "Google Maps", "Google Maps")}
                  </a>
                )}
                <button type="button" onClick={() => copyText(wgsClipboardText, "wgs")} className="fml-action">
                  {copiedTarget === "wgs" ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copiedTarget === "wgs" ? t("تم النسخ", "Copied", "Kopyalandı") : t("نسخ WGS84", "Copy WGS84", "WGS84 kopyala")}
                </button>
                <button type="button" onClick={() => copyText(utmClipboardText, "utm")} className="fml-action" disabled={utmRows.length === 0}>
                  {copiedTarget === "utm" ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copiedTarget === "utm" ? t("تم النسخ", "Copied", "Kopyalandı") : t("نسخ UTM", "Copy UTM", "UTM kopyala")}
                </button>
                {whatsappShareUrl && (
                  <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer" className="fml-action">
                    <MessageCircle size={16} />
                    {t("مشاركة واتساب", "Share on WhatsApp", "WhatsApp'ta paylaş")}
                  </a>
                )}
                <button type="button" onClick={shareToMessenger} className="fml-action" disabled={!googleMapsUrl}>
                  {copiedTarget === "share" ? <CheckCircle2 size={16} /> : <Send size={16} />}
                  {copiedTarget === "share" ? t("نُسخ الرابط", "Link copied", "Bağlantı kopyalandı") : t("مشاركة", "Share", "Paylaş")}
                </button>
                <button type="button" onClick={copySummary} className="fml-action">
                  {copiedTarget === "all" ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copiedTarget === "all" ? t("تم النسخ", "Copied", "Kopyalandı") : t("نسخ الملخص", "Copy summary", "Özeti kopyala")}
                </button>
                <button type="button" onClick={copyExport} className="fml-action" disabled={!exportPayload}>
                  {copiedTarget === "export" ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copiedTarget === "export" ? t("تم النسخ", "Copied", "Kopyalandı") : t("تصدير البيانات", "Export data", "Verileri dışa aktar")}
                </button>
              </div>
            )}
            {actionError && !crsSelectionRequired && (
              <p className="fml-error-text" role="alert">{actionError}</p>
            )}

            {/* --- Manual CRS override, always available after a result --- */}
            {!crsSelectionRequired && !isOmanResult && (
              <details className="fml-advanced">
                <summary>{t("تصحيح نظام الإحداثيات", "Correct the coordinate system", "Koordinat sistemini düzelt")}</summary>
                <div className="fml-advanced-body">
                  <p className="fml-hint">
                    {t(
                      "إذا كان المستند غير واضح، اختر النظام الصحيح ثم أعد التحليل. يدعم النظام Zone 1–60 و N / S.",
                      "If the document is unclear, choose the correct system and re-analyse. Zones 1–60 and N / S are supported.",
                      "Belge belirsizse doğru sistemi seçip yeniden analiz edin. Zone 1–60 ve N / S desteklenir.",
                    )}
                  </p>
                  {crsControls}
                  <button type="button" onClick={() => reanalyze()} className="fml-primary-btn">
                    <RotateCcw size={16} />
                    {t("إعادة التحليل", "Re-analyse", "Yeniden analiz et")}
                  </button>
                </div>
              </details>
            )}

            {/* --- Review notes --- */}
            {analysis.result.warnings && analysis.result.warnings.length > 0 && (
              <section className="fml-panel fml-panel--notes" hidden>
                <div className="fml-panel-head">
                  <AlertTriangle size={18} />
                  <div>
                    <h3>{t("ملاحظات المراجعة", "Review notes", "İnceleme notları")}</h3>
                  </div>
                </div>
                <ul className="fml-notes">
                  {[...new Set(analysis.result.warnings.map((warning) => translatedWarning(warning, locale)))].map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            )}

          </div>
        )}
      </div>
    </ToolCalculatorShell>
  );
}
