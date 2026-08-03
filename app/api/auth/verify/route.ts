import { and, eq, gt, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { users, verificationChallenges } from "@/db/mysql/schema";
import { sha256Hex } from "@/lib/auth/crypto";
import { nowMySqlDateTime, toMySqlDateTime } from "@/lib/auth/mysql-time";
import { getMySqlDb } from "@/lib/mysql-db";

export const dynamic = "force-dynamic";

type VerifyBody = {
  challengeId?: string;
  code?: string;
};

export async function POST(request: NextRequest) {
  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!challengeId || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const db = getMySqlDb();
  const nowSql = nowMySqlDateTime();

  const challenge = await db
    .select()
    .from(verificationChallenges)
    .where(
      and(
        eq(verificationChallenges.id, challengeId),
        eq(verificationChallenges.purpose, "signup"),
        isNull(verificationChallenges.consumedAt),
        gt(verificationChallenges.expiresAt, nowSql),
      ),
    )
    .limit(1);

  if (!challenge[0]) {
    return NextResponse.json({ error: "challenge_expired" }, { status: 410 });
  }

  if (challenge[0].attempts >= 5) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  const codeHash = await sha256Hex(code);
  if (codeHash !== challenge[0].codeHash) {
    await db
      .update(verificationChallenges)
      .set({ attempts: challenge[0].attempts + 1 })
      .where(eq(verificationChallenges.id, challengeId));
    return NextResponse.json({ error: "wrong_code" }, { status: 401 });
  }

  await db.update(verificationChallenges).set({ consumedAt: nowSql }).where(eq(verificationChallenges.id, challengeId));
  await db.update(users).set({ status: "active", emailVerifiedAt: nowSql }).where(eq(users.id, challenge[0].userId));

  return NextResponse.json({ verified: true });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { Allow: "POST, OPTIONS" },
  });
}
