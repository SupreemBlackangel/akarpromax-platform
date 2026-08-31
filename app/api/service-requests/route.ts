import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { createRequestFull, listRequestsFull } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";
import { resolveCurrencyCode } from "@services/currency-policy";
import { geoAliases } from "@/lib/geo/platform-location";
import { GeoService } from "@/lib/services/geo/geo.service";
import { resolveGeoSelection } from "@/lib/services/geo/selection";

export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanAnswers(value: unknown): Array<{ key: string; label?: string | null; type?: string | null; value?: string | null }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const answer = item as Record<string, unknown>;
    const key = clean(answer.key, 120);
    if (!key) return [];
    return [{ key, label: clean(answer.label, 200) || null, type: clean(answer.type, 40) || null, value: typeof answer.value === "string" ? answer.value.slice(0, 4000) : null }];
  }).slice(0, 50);
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const mine = q.get("mine") === "1";
  // Supervisor listing: ?all=1 with SERVICE_REQUESTS_MANAGE_ALL sees every
  // request in any status (contact details included, like `mine`).
  let allRequests = q.get("all") === "1";
  let customerUserId: string | undefined;
  if (mine || allRequests) {
    const identity = await getSessionIdentity();
    if (!identity.authenticated || !identity.email) {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    }
    if (allRequests && !hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL)) {
      allRequests = false;
    }
    if (mine) customerUserId = identity.email;
  }
  const requestedStatus = q.get("status");
  const publicStatus = requestedStatus === "receiving_offers" ? "receiving_offers" : "published";
  const rawScope = q.get("scope");
  if (rawScope && rawScope !== "local" && rawScope !== "global") {
    return NextResponse.json({ error: "GEO_INVALID_SELECTION" }, { status: 400 });
  }
  const geoProvider = new GeoService();
  const geoResolution = await resolveGeoSelection({
    scope: rawScope as "local" | "global" | undefined,
    country: q.get("country"),
    governorate: q.get("governorate"),
    city: q.get("cityId"),
    district: q.get("districtId"),
  }, geoProvider);
  if (!geoResolution.ok) {
    return NextResponse.json({ error: geoResolution.error }, { status: 400 });
  }
  const geo = geoResolution.value;
  const regionCityAliases = geo.governorate && !geo.city
    ? (await geoProvider.getCities(geo.governorate.id)).flatMap(geoAliases)
    : geo.aliases.city;
  const requests = await listRequestsFull({
    countryCode: geo.country?.code,
    countryAliases: geo.aliases.country,
    cityId: geo.city?.code ?? geo.city?.id,
    cityAliases: regionCityAliases,
    districtId: geo.district?.code ?? geo.district?.id,
    districtAliases: geo.aliases.district,
    categoryId: q.get("categoryId") ?? undefined,
    status: mine || allRequests ? requestedStatus ?? undefined : publicStatus,
    customerUserId,
    urgency: q.get("urgency") ?? undefined,
    limit: q.get("limit") ? Math.max(1, Math.min(100, Number(q.get("limit")) || 50)) : 50,
  });
  const safeRequests = mine || allRequests ? requests : requests.map((request) => {
    const safe = { ...request };
    for (const key of ["customer_user_id", "latitude", "longitude", "contact_phone", "contact_email", "contact_preference", "access_notes"]) {
      delete safe[key];
    }
    return safe;
  });
  return NextResponse.json({ requests: safeRequests }, { headers: { "Cache-Control": mine || allRequests ? "no-store" : "public, max-age=30, stale-while-revalidate=90" } });
}

export async function POST(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_OWN) && !hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const categoryId = clean(body.categoryId, 80);
  const countryCode = clean(body.countryCode, 8);
  const cityId = clean(body.cityId, 100);
  if (!categoryId || !countryCode || !cityId) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const currency = resolveCurrencyCode(body.currency);
  if (!currency.ok) {
    return NextResponse.json({ error: currency.error }, { status: 400 });
  }
  const id = await createRequestFull(
    {
      customerUserId: identity.email,
      categoryId,
      countryCode,
      cityId,
      districtId: clean(body.districtId, 100) || null,
      latitude: cleanNumber(body.latitude),
      longitude: cleanNumber(body.longitude),
      title: clean(body.title, 300) || null,
      description: clean(body.description, 4000) || null,
      budgetMin: cleanNumber(body.budgetMin),
      budgetMax: cleanNumber(body.budgetMax),
      currency: currency.code,
      urgency: clean(body.urgency, 24) || null,
      preferredPeriod: clean(body.preferredPeriod, 200) || null,
      needsVisit: body.needsVisit === true,
      accessNotes: clean(body.accessNotes, 1000) || null,
      shortAddress: clean(body.shortAddress, 300) || null,
      pricingType: clean(body.pricingType, 24) || null,
      preferredDate: clean(body.preferredDate, 40) || null,
      contactPhone: clean(body.contactPhone, 32) || null,
      contactEmail: clean(body.contactEmail, 200) || null,
      contactPreference: ["platform", "phone", "whatsapp", "email"].includes(String(body.contactPreference))
        ? body.contactPreference as "platform" | "phone" | "whatsapp" | "email"
        : "platform",
      answers: cleanAnswers(body.answers),
      attachments: Array.isArray(body.attachments) ? body.attachments.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const attachment = item as Record<string, unknown>;
        const fileName = clean(attachment.fileName, 300);
        const fileUrl = clean(attachment.fileUrl, 800);
        return fileName && fileUrl ? [{ fileName, fileUrl, fileSize: cleanNumber(attachment.fileSize) ?? 0, mimeType: clean(attachment.mimeType, 120) || null }] : [];
      }).slice(0, 20) : [],
    },
    { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
  );
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
