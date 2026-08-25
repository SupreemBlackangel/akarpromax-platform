import { NextRequest, NextResponse } from "next/server";
import { authenticateOfficeRequest, requireScope } from "@/lib/integration/office-auth";
import { syncPush, syncPull, listSyncOperations, retryFailedOperations, deadLetterExpired, type SyncPushItem } from "@/lib/integration/sync";
import { enforceRateLimit, clientIp } from "@/lib/security/rate-limit";
import { logSecurityEvent } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

function parseBody(raw: unknown): SyncPushItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      const idem = String(item.idempotencyKey ?? "").trim();
      if (!idem) return null;
      const operationType = String(item.operationType ?? "property.upsert");
      if (!["property.upsert", "property.delete"].includes(operationType)) return null;
      return {
        operationType: operationType as SyncPushItem["operationType"],
        entityId: String(item.entityId ?? "").slice(0, 120),
        payload: (item.payload as Record<string, unknown>) ?? {},
        clientUpdatedAt: String(item.clientUpdatedAt ?? new Date().toISOString().slice(0, 19).replace("T", " ")),
        idempotencyKey: idem.slice(0, 160),
      };
    })
    .filter((item): item is SyncPushItem => item !== null);
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "retry") {
    const auth = await authenticateOfficeRequest(req);
    if ("error" in auth) return auth.error;
    const blocked = requireScope(auth.device, "office.sync");
    if (blocked) return blocked;
    const requeued = await retryFailedOperations();
    return NextResponse.json({ requeued });
  }

  if (action === "dead-letter") {
    const auth = await authenticateOfficeRequest(req);
    if ("error" in auth) return auth.error;
    const blocked = requireScope(auth.device, "office.sync");
    if (blocked) return blocked;
    const deadLettered = await deadLetterExpired();
    return NextResponse.json({ deadLettered });
  }

  const rate = await enforceRateLimit("office_sync_push", clientIp(req), req.nextUrl.pathname);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.sync");
  if (blocked) return blocked;

  const body = (await req.json()) as Record<string, unknown>;
  const items = parseBody(body.items);
  if (!items.length) return NextResponse.json({ error: "items required" }, { status: 400 });

  const result = await syncPush(auth.device.deviceId, items, (server, incoming) => {
    void server;
    void incoming;
    return { action: "accept-server" };
  });

  await logSecurityEvent("OFFICE_SYNC_PUSH", {
    deviceId: auth.device.deviceId,
    accepted: result.accepted,
    conflicts: result.conflicts,
    duplicates: result.duplicates,
  });

  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.sync");
  if (blocked) return blocked;

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const sinceId = url.searchParams.get("sinceId") ?? undefined;
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") ?? 100)));

  if (action === "operations") {
    const ops = await listSyncOperations(auth.device.deviceId);
    return NextResponse.json({ operations: ops });
  }

  const items = await syncPull(auth.device.deviceId, sinceId, limit);
  return NextResponse.json({ items });
}
