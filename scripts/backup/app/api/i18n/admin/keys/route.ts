import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.I18N_VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const namespace = request.nextUrl.searchParams.get("namespace");
  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  const db = await getRuntimeDb();

  let where = "";
  const params: unknown[] = [];
  if (namespace) {
    where += " WHERE n.code = ?1";
    params.push(namespace);
  }
  if (search) {
    where += where ? " AND" : " WHERE";
    where += " (k.`key` LIKE ?2 OR t.value LIKE ?2)";
    params.push(`%${search}%`);
  }

  const result = await db
    .prepare(
      `SELECT n.code AS namespace, k.\`key\` AS \`key\`, k.description AS description,
              t.locale AS locale, t.value AS value, t.status AS status
       FROM i18n_keys k
       JOIN i18n_namespaces n ON n.id = k.namespace_id
       LEFT JOIN i18n_translations t ON t.key_id = k.id
       ${where}
       ORDER BY n.code, k.\`key\`, t.locale
       LIMIT 500`,
    )
    .bind(...params)
    .all<{ namespace: string; key: string; description: string | null; locale: string | null; value: string | null; status: string | null }>();

  const rows = result.results ?? [];
  const namespacesResult = await db.prepare("SELECT code FROM i18n_namespaces ORDER BY code").all<{ code: string }>();

  return NextResponse.json({
    namespaces: (namespacesResult.results ?? []).map((row) => row.code),
    keys: rows,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, OPTIONS" } });
}
