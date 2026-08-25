import { NextRequest, NextResponse } from "next/server";
import { resolveLandDocument } from "@/lib/land/intelligence";
import { sanitizePositionedItems } from "@/lib/land/intelligence/positioned-evidence";
import { storeResolveResult } from "@/lib/land/resolve-store";
import { checkRateLimit } from "@/lib/amrs/security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit("api:land:resolve", { maxRequests: 60, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", resetAt: rateLimit.resetAt },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const input = body as {
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    nativeText?: string;
    ocrText?: string;
    ocrConfidence?: number;
    countryCode?: string;
    utmZone?: number;
    utmHemisphere?: "N" | "S";
    crsMode?: "auto" | "wgs84" | "utm";
    coordinateGroupId?: string;
    pages?: string[];
    confirmedOrder?: number[];
    positionedItems?: unknown;
  };

  if (typeof input.nativeText !== "string" && typeof input.ocrText !== "string") {
    return NextResponse.json({ error: "MISSING_TEXT" }, { status: 400 });
  }

  if (
    input.utmZone !== undefined
    && (!Number.isInteger(input.utmZone) || input.utmZone < 1 || input.utmZone > 60)
  ) {
    return NextResponse.json({ error: "INVALID_UTM_ZONE" }, { status: 400 });
  }
  if (input.utmHemisphere !== undefined && input.utmHemisphere !== "N" && input.utmHemisphere !== "S") {
    return NextResponse.json({ error: "INVALID_UTM_HEMISPHERE" }, { status: 400 });
  }
  if (
    input.crsMode !== undefined
    && input.crsMode !== "auto"
    && input.crsMode !== "wgs84"
    && input.crsMode !== "utm"
  ) {
    return NextResponse.json({ error: "INVALID_CRS_MODE" }, { status: 400 });
  }
  if (input.coordinateGroupId !== undefined && typeof input.coordinateGroupId !== "string") {
    return NextResponse.json({ error: "INVALID_COORDINATE_GROUP" }, { status: 400 });
  }
  if (
    input.pages !== undefined
    && (!Array.isArray(input.pages) || input.pages.some((page) => typeof page !== "string"))
  ) {
    return NextResponse.json({ error: "INVALID_PAGES" }, { status: 400 });
  }
  if (
    input.confirmedOrder !== undefined
    && (!Array.isArray(input.confirmedOrder)
      || input.confirmedOrder.some((index) => !Number.isInteger(index) || index < 0 || index > 999))
  ) {
    return NextResponse.json({ error: "INVALID_CONFIRMED_ORDER" }, { status: 400 });
  }

  const result = await resolveLandDocument({
    metadata: {
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      nativeText: input.nativeText,
    },
    ocrText: input.ocrText,
    ocrConfidence: typeof input.ocrConfidence === "number" ? input.ocrConfidence : undefined,
    countryCode: input.countryCode,
    utmZone: input.utmZone,
    utmHemisphere: input.utmHemisphere,
    crsMode: input.crsMode,
    coordinateGroupId: input.coordinateGroupId,
    pages: input.pages,
    confirmedOrder: input.confirmedOrder,
    // Positioned text is validated rather than trusted: it arrives from the
    // browser, and a malformed item must cost nothing.
    positionedItems: sanitizePositionedItems(input.positionedItems),
  });

  const stored = storeResolveResult(result);
  return NextResponse.json({ id: stored.id, ...stored.result }, { status: 200 });
}

export function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "POST, OPTIONS" } });
}
