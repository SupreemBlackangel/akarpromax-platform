import { NextRequest, NextResponse } from "next/server";
import { canAccessAmrsAdmin } from "@/lib/amrs/access";
import { getSession } from "@/lib/auth/session";
import { getReputationProfile, getReputationHistory, getReputationDistribution, evaluateReputation, manualOverride } from "@/lib/amrs/reputation";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";
import { getSessionIdentity } from "@/lib/sponsor-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await ensurePgIdentitySchema();
  const q = request.nextUrl.searchParams;
  const entityType = (q.get("entityType") ?? "professional") as "user" | "professional" | "organization";
  const entityId = q.get("entityId");

  if (q.has("distribution")) {
    const identity = await getSessionIdentity();
    if (!canAccessAmrsAdmin(identity)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const dist = await getReputationDistribution();
    return NextResponse.json({ distribution: dist }, { headers: { "Cache-Control": "no-store" } });
  }

  if (entityType === "user") {
    return NextResponse.json({ error: "FORBIDDEN_ENTITY_TYPE" }, { status: 403 });
  }

  if (!entityId) {
    return NextResponse.json({ error: "MISSING_ENTITY_ID" }, { status: 400 });
  }

  const profile = await getReputationProfile(entityType, entityId);
  if (!profile) {
    return NextResponse.json({ profile: null, history: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const history = await getReputationHistory(entityType, entityId);
  return NextResponse.json({ profile, history }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  await ensurePgIdentitySchema();
  const identity = await getSessionIdentity();
  const session = await getSession(request.headers.get("cookie") ?? undefined);
  if (!canAccessAmrsAdmin(identity)) {
    return NextResponse.json({ error: identity.authenticated ? "FORBIDDEN" : "UNAUTHORIZED" }, { status: identity.authenticated ? 403 : 401 });
  }
  if (!session?.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "evaluate";
  const entityType = body.entityType as "user" | "professional" | "organization";
  const entityId = typeof body.entityId === "string" ? body.entityId : "";
  if (!entityType || !["user", "professional", "organization"].includes(entityType) || !entityId) {
    return NextResponse.json({ error: "INVALID_ENTITY" }, { status: 400 });
  }

  if (action === "override") {
    const targetLevel = typeof body.targetLevel === "string" ? body.targetLevel : "";
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (!targetLevel || !["new", "rising", "distinguished", "gold", "promax"].includes(targetLevel) || !reason) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const profile = await manualOverride(entityType, entityId, targetLevel as "new" | "rising" | "distinguished" | "gold" | "promax", reason, session.userId);
    return NextResponse.json({ ok: true, profile }, { status: 200 });
  }

  const rawSignals = (body.signals ?? {}) as Record<string, unknown>;
  const toNumber = (key: string) => {
    const value = Number(rawSignals[key] ?? 0);
    return Number.isFinite(value) ? value : 0;
  };
  const result = await evaluateReputation(
    entityType,
    entityId,
    {
      verification: toNumber("verification"),
      profileCompleteness: toNumber("profileCompleteness"),
      responseRate: toNumber("responseRate"),
      completedJobs: toNumber("completedJobs"),
      rating: toNumber("rating"),
      cancellationRate: toNumber("cancellationRate"),
      resolvedDisputes: toNumber("resolvedDisputes"),
      policyCompliance: toNumber("policyCompliance"),
      recentActivity: toNumber("recentActivity"),
    },
    typeof body.reason === "string" ? body.reason.trim().slice(0, 500) || "manual_evaluation" : "manual_evaluation",
    false,
    session.userId,
    { organizationType: typeof body.organizationType === "string" ? body.organizationType as "real_estate" | "business" | "other" : undefined },
  );
  return NextResponse.json({ ok: true, ...result }, { status: 200 });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
