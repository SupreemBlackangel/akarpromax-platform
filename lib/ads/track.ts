import { verifyTrackingToken } from "@/lib/ads/events";
import { buildContext, type MatchRequest } from "@/lib/ads/context";
import type { ResolvedAdContext } from "@/lib/ads/types";
import { isAdChannel } from "@/lib/ads/types";
import type { ServerAdContext } from "@/lib/ads/server-context";

export type TrackRequest = MatchRequest & { campaignId?: string; token?: string; conversionType?: string; value?: number };

export type ResolveResult =
  | { ok: true; ctx: ResolvedAdContext; campaignId: string; creativeId: string | null; channel: string; inventoryClass: "commercial"; nonce: string | undefined }
  | { ok: false; error: string; status: number };

export async function resolveTrackRequest(body: TrackRequest, server?: ServerAdContext): Promise<ResolveResult> {
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return { ok: false, error: "Missing tracking token", status: 400 };
  const payload = await verifyTrackingToken(token);
  if (!payload) return { ok: false, error: "Invalid or expired tracking token", status: 400 };
  const campaignId = typeof body.campaignId === "string" ? body.campaignId.trim() : "";
  if (!campaignId) return { ok: false, error: "Missing campaignId", status: 400 };
  if (payload.cid !== campaignId) return { ok: false, error: "Tracking token mismatch", status: 400 };
  const ctx = buildContext(body, server);
  if (payload.pl) ctx.placement = payload.pl;
  if (payload.sec) ctx.section = payload.sec;
  if (payload.pg) ctx.pageType = payload.pg;
  if (isAdChannel(payload.ch)) ctx.channel = payload.ch;
  return {
    ok: true,
    ctx,
    campaignId,
    creativeId: payload.cr ?? null,
    channel: payload.ch ?? "website",
    inventoryClass: payload.ic ?? "commercial",
    nonce: payload.n,
  };
}
