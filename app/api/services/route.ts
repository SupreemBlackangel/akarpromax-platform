/**
 * L1C-0 — legacy `/api/services` collection route.
 *
 * BEFORE: this route owned a second, parallel Services persistence path — it
 * read and wrote the Drizzle/PG model in `lib/db/schemas/services-schema.ts`
 * (`service_requests` with a `uuid` id / `user_id` / `governorate` layout),
 * while the whole Services Marketplace (`/api/service-*`) reads and writes the
 * canonical `service_requests` table owned by `lib/services/marketplace.ts`.
 *
 * AFTER: the route is a thin HTTP wrapper over the compatibility adapter in
 * `lib/services/compat/services-api.ts`, which delegates to the canonical
 * marketplace domain service. The public request/response contract is
 * preserved by an explicit mapper; there is now exactly one Services store.
 */
import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import {
  ServicesCompatValidationError,
  SERVICES_COMPAT_ERRORS,
  createLegacyServiceRequest,
  listLegacyServiceRequests,
} from "@services/compat/services-api";

export const dynamic = "force-dynamic";

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { data, page, limit, total } = await listLegacyServiceRequests({
      category: searchParams.get("category"),
      search: searchParams.get("search"),
      page: parsePositiveInt(searchParams.get("page"), 1),
      limit: parsePositiveInt(searchParams.get("limit"), 20),
    });

    return NextResponse.json({ success: true, data, pagination: { page, limit, total } });
  } catch {
    return NextResponse.json({ success: false, error: "فشل في جلب الخدمات" }, { status: 500 });
  }
}

/** Arabic messages kept for contract compatibility; `code` is the machine contract. */
const VALIDATION_MESSAGES: Record<string, string> = {
  [SERVICES_COMPAT_ERRORS.INVALID_BODY]: "طلب غير صالح",
  [SERVICES_COMPAT_ERRORS.CURRENCY_REQUIRED]: "العملة مطلوبة",
  [SERVICES_COMPAT_ERRORS.CURRENCY_UNSUPPORTED]: "عملة غير مدعومة",
};

export async function POST(request: NextRequest) {
  try {
    const identity = await getSessionIdentity();
    if (!identity.authenticated || !identity.email) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }
    if (
      !hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_OWN) &&
      !hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL)
    ) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "فشل في إنشاء طلب الخدمة" }, { status: 400 });
    }

    const created = await createLegacyServiceRequest(identity.email, body, {
      userId: identity.email,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    if (error instanceof ServicesCompatValidationError) {
      return NextResponse.json(
        { success: false, error: VALIDATION_MESSAGES[error.code] ?? "طلب غير صالح", code: error.code },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: false, error: "فشل في إنشاء طلب الخدمة" }, { status: 500 });
  }
}
