import { QuoteRequest, QuoteRequestInput } from "./contracts";

const quotes = new Map<string, QuoteRequest>();

export const QUOTE_SERVICES = [
  "measurement",
  "boundary_survey",
  "land_certification",
  "zoning_report",
  "valuation",
  "gis_analysis",
] as const;

export type QuoteService = (typeof QUOTE_SERVICES)[number];

export const QUOTE_SERVICE_LABELS: Record<QuoteService, string> = {
  measurement: "قياس المساحة",
  boundary_survey: "مسح الحدود",
  land_certification: "توثيق الأرض",
  zoning_report: "تقرير نظام الحماية",
  valuation: "تثمين العقار",
  gis_analysis: "تحليل GIS",
};

export function isValidQuoteService(service: string | undefined): boolean {
  if (!service) return true;
  return (QUOTE_SERVICES as readonly string[]).includes(service);
}

export function generateQuoteId(): string {
  return `quote_${Math.random().toString(36).slice(2, 10)}`;
}

export function createQuoteRequest(input: QuoteRequestInput): QuoteRequest {
  const quote: QuoteRequest = {
    id: generateQuoteId(),
    landId: input.landId,
    surveyorId: input.surveyorId,
    requesterId: input.requesterId,
    service: input.service ?? "measurement",
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    currency: input.currency ?? "SAR",
    preferredDate: input.preferredDate,
    notes: input.notes,
    status: "pending",
    createdAt: Date.now(),
  };
  quotes.set(quote.id, quote);
  return quote;
}

export function getQuote(id: string): QuoteRequest | null {
  return quotes.get(id) ?? null;
}

export function getQuotesByLand(landId: string): QuoteRequest[] {
  return Array.from(quotes.values())
    .filter((q) => q.landId === landId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getQuotesBySurveyor(surveyorId: string): QuoteRequest[] {
  return Array.from(quotes.values())
    .filter((q) => q.surveyorId === surveyorId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function updateQuoteStatus(
  id: string,
  status: QuoteRequest["status"],
  actorId: string,
): QuoteRequest | null {
  const quote = quotes.get(id);
  if (!quote) return null;
  if (quote.surveyorId !== actorId) return null;
  quote.status = status;
  return quote;
}

export function clearQuotes(): void {
  quotes.clear();
}

export function countQuotes(): number {
  return quotes.size;
}
