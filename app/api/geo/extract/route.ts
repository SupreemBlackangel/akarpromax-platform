import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/geo/pipeline";
import { checkRateLimit } from "@/lib/amrs/security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit("api:geo:extract", {
    maxRequests: 20,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", resetAt: rateLimit.resetAt },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
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
    nativeText?: string;
    ocrText?: string;
    visionText?: string;
    sizeBytes?: number;
    countryCode?: string;
  };

  const result = runPipeline({
    metadata: {
      fileName: input.fileName,
      mimeType: input.mimeType,
      nativeText: input.nativeText,
      sizeBytes: input.sizeBytes,
    },
    ocrText: input.ocrText,
    visionText: input.visionText,
    countryCode: input.countryCode,
  });

  if (!result.gate.securityPassed) {
    return NextResponse.json(
      { error: "SECURITY_GATE", reason: result.gate.securityReason },
      { status: 400 },
    );
  }

  if (!result.result) {
    return NextResponse.json({ error: "UNPROCESSABLE" }, { status: 422 });
  }

  const status =
    result.result.location.status === "resolved" ? 200 : result.result.location.status === "partial" ? 206 : 404;

  return NextResponse.json(result.result, { status });
}

export function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "POST, OPTIONS" } });
}
