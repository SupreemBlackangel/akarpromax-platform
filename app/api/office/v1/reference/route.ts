import { NextRequest, NextResponse } from "next/server";

import { authenticateOfficeRequest, requireScope } from "@/lib/integration/office-auth";
import { buildOfficeReference } from "@/lib/integration/reference";

export const dynamic = "force-dynamic";

/**
 * The drop-downs the desktop office app fills its forms from.
 *
 * Offer types, property categories and types, the office's listing statuses and
 * the currencies — all from the same sources the website uses, so the two
 * products cannot disagree about what a property is.
 *
 * Scoped to `office.properties.read`, which every paired device already holds.
 * A new scope would have locked out every device paired before today, and this
 * is reference data a device that may read properties may obviously read.
 *
 * The desktop caches the payload and sends `If-None-Match`; an unchanged
 * catalogue answers 304 with no body, so the every-six-hours poll from every
 * installed copy costs a few bytes rather than a few kilobytes each.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.properties.read");
  if (blocked) return blocked;

  const reference = await buildOfficeReference();
  const etag = `"${reference.version}"`;

  // Weak or quoted, a client may echo the tag either way; comparing the bare
  // version is what actually matters.
  const requested = req.headers.get("if-none-match") ?? "";
  if (requested.replace(/^W\//, "").replace(/"/g, "").trim() === reference.version) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "private, max-age=0, must-revalidate" },
    });
  }

  return NextResponse.json(reference, {
    headers: { ETag: etag, "Cache-Control": "private, max-age=0, must-revalidate" },
  });
}
