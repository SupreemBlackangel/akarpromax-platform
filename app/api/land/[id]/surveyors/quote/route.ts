import { NextRequest, NextResponse } from "next/server";
import { requestSurveyorQuote } from "@/lib/land/flow";
import { QuoteRequestInput } from "@/lib/land/contracts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const input = body as Partial<QuoteRequestInput>;

  if (!input.surveyorId || !input.requesterId) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const result = requestSurveyorQuote({
    landId: id,
    surveyorId: input.surveyorId,
    requesterId: input.requesterId,
    service: input.service,
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    currency: input.currency,
    preferredDate: input.preferredDate,
    notes: input.notes,
  });

  if (!result.ok || !result.quote) {
    const status = result.error === "LAND_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.quote, { status: 201 });
}

export function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "POST, OPTIONS" } });
}
