export interface UploadMetadata {
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly nativeText?: string;
}

export interface GateResult {
  readonly passed: boolean;
  readonly reason?: string;
  readonly normalizedMime?: string;
}

export const ALLOWED_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const ALLOWED_EXTENSIONS: readonly string[] = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  // JFIF is an ordinary JPEG that Windows and Edge hand over under a
  // different extension; survey sketches photographed on a phone and saved
  // from a browser arrive this way.
  "jfif",
  "webp",
  "tiff",
  "tif",
  "txt",
  "doc",
  "docx",
  "xls",
  "xlsx",
];

const BLOCKED_EXTENSIONS: readonly string[] = [
  "exe",
  "js",
  "mjs",
  "bat",
  "cmd",
  "sh",
  "ps1",
  "vbs",
  "scr",
  "msi",
  "dll",
  "html",
  "htm",
  "svg",
  "hta",
];

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

const BLOCKED_CONTENT_PATTERNS: readonly RegExp[] = [
  /<script[\s>]/i,
  /<\?php/i,
  /<\%\s*@\s*page/i,
  /(?:^|[\s;])(?:powershell|cmd\.exe|\/bin\/sh|base64\s+-d)/i,
];

export function getFileExtension(fileName?: string): string | null {
  if (!fileName) return null;
  const match = /\.([A-Za-z0-9]{1,12})$/.exec(fileName);
  return match ? match[1].toLowerCase() : null;
}

export function checkDocumentSecurity(metadata: UploadMetadata): GateResult {
  const ext = getFileExtension(metadata.fileName);

  if (ext && BLOCKED_EXTENSIONS.includes(ext)) {
    return { passed: false, reason: `BLOCKED_EXTENSION:${ext}` };
  }

  if (metadata.sizeBytes !== undefined && metadata.sizeBytes > MAX_SIZE_BYTES) {
    return { passed: false, reason: `FILE_TOO_LARGE:${metadata.sizeBytes}` };
  }

  if (metadata.sizeBytes !== undefined && metadata.sizeBytes <= 0) {
    return { passed: false, reason: "EMPTY_FILE" };
  }

  if (metadata.mimeType && metadata.mimeType.startsWith("text/")) {
    const lower = metadata.nativeText ?? "";
    for (const pattern of BLOCKED_CONTENT_PATTERNS) {
      if (pattern.test(lower)) {
        return { passed: false, reason: "MALICIOUS_CONTENT" };
      }
    }
  }

  let normalizedMime: string | undefined;
  if (metadata.mimeType) {
    normalizedMime = metadata.mimeType.toLowerCase();
  } else if (ext) {
    const mimeByExt: Record<string, string> = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      jfif: "image/jpeg",
      webp: "image/webp",
      tiff: "image/tiff",
      tif: "image/tiff",
      txt: "text/plain",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
    normalizedMime = mimeByExt[ext];
  }

  if (
    normalizedMime &&
    !ALLOWED_MIME_TYPES.includes(normalizedMime) &&
    !normalizedMime.startsWith("image/")
  ) {
    return { passed: false, reason: `UNSUPPORTED_MIME:${normalizedMime}` };
  }

  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
    return { passed: false, reason: `UNSUPPORTED_EXTENSION:${ext}` };
  }

  return { passed: true, normalizedMime };
}

export const GEO_RELEVANCE_KEYWORDS: readonly { keyword: string; weight: number }[] = [
  { keyword: "coordinates", weight: 3 },
  { keyword: "coordinate", weight: 3 },
  { keyword: "latitude", weight: 3 },
  { keyword: "longitude", weight: 3 },
  { keyword: "location", weight: 2 },
  { keyword: "address", weight: 2 },
  { keyword: "map", weight: 2 },
  { keyword: "parcel", weight: 2 },
  { keyword: "plot", weight: 2 },
  { keyword: "plan", weight: 1 },
  { keyword: "land", weight: 1 },
  { keyword: "property", weight: 1 },
  { keyword: "deed", weight: 2 },
  { keyword: "survey", weight: 2 },
  { keyword: "boundary", weight: 2 },
  { keyword: "utm", weight: 3 },
  { keyword: "الإحداثيات", weight: 3 },
  { keyword: "خط الطول", weight: 3 },
  { keyword: "خط العرض", weight: 3 },
  { keyword: "الموقع", weight: 2 },
  { keyword: "العنوان", weight: 2 },
  { keyword: "الخريطة", weight: 2 },
  { keyword: "قطعة", weight: 2 },
  { keyword: "مخطط", weight: 2 },
  { keyword: "أرض", weight: 1 },
  { keyword: "عقار", weight: 1 },
  { keyword: "صك", weight: 2 },
  { keyword: "ملكية", weight: 2 },
  { keyword: "حدود", weight: 2 },
  { keyword: "مسح", weight: 2 },
  { keyword: "مساحة", weight: 2 },
  { keyword: "مساحي", weight: 2 },
  { keyword: "قرار", weight: 2 },
  { keyword: "قرار مساحي", weight: 3 },
  { keyword: "تقرير مساحي", weight: 3 },
  { keyword: "تقرير", weight: 1 },
  { keyword: "حي", weight: 1 },
  { keyword: "مدينة", weight: 1 },
  { keyword: "شارع", weight: 1 },
];

export function isGeoRelevant(text: string, minScore = 2): boolean {
  const score = geoRelevanceScore(text);
  return score >= minScore;
}

export function geoRelevanceScore(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const { keyword, weight } of GEO_RELEVANCE_KEYWORDS) {
    if (lower.includes(keyword)) {
      score += weight;
    }
  }
  return score;
}

export function checkRelevanceGate(
  text: string,
  minScore = 2,
): { passed: boolean; score: number } {
  const score = geoRelevanceScore(text);
  return { passed: score >= minScore, score };
}
