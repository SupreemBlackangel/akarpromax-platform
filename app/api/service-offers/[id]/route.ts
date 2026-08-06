import { NextRequest, NextResponse } from "next/server";

import { getRuntimeDb } from "@/lib/runtime-db";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = await getRuntimeDb();
  const offer = await db.prepare("SELECT * FROM service_offers WHERE id = ?1").bind(id).first<Record<string, unknown>>();
  if (!offer) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.OFFER_NOT_FOUND }, { status: 404 });
  }
  const revisions = await db.prepare("SELECT * FROM service_offer_revisions WHERE offer_id = ?1 ORDER BY revision_number ASC").bind(id).all<Record<string, unknown>>();
  const request = await db.prepare("SELECT id, reference_number, title, customer_user_id FROM service_requests WHERE id = ?1").bind(String(offer.request_id)).first<Record<string, unknown>>();
  return NextResponse.json({ offer, revisions: revisions.results ?? [], request }, { headers: { "Cache-Control": "no-store" } });
}
