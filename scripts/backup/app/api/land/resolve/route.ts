import { NextRequest, NextResponse } from "next/server";
import { resolveLandDocument } from "@/lib/land/intelligence";
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
    countryCode?: string;
  };

  if (typeof input.nativeText !== "string" && typeof input.ocrText !== "string") {
    return NextResponse.json({ error: "MISSING_TEXT" }, { status: 400 });
  }

  const result = await resolveLandDocument({
    metadata: {
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      nativeText: input.nativeText,
    },
    ocrText: input.ocrText,
    countryCode: input.countryCode,
  });

  const stored = storeResolveResult(result);
  return NextResponse.json({ id: stored.id, ...stored.result }, { status: 200 });
}

export function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "POST, OPTIONS" } });
}
