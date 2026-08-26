import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { createI18nKey } from "@/lib/i18n/db";
import { getStaticFlatBundle } from "@/lib/i18n/core";
import { LOCALES } from "@/lib/i18n/keys";
import type { Locale } from "@/src/types/site";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const NAME_PATTERN = /^[a-z0-9._-]+$/i;
const MAX_NAMESPACE_LENGTH = 80;
const MAX_KEY_LENGTH = 160;

type KeyRow = {
  namespace: string;
  key: string;
  description: string | null;
  locale: string | null;
  value: string | null;
  status: string | null;
};

/**
 * Build the shared WHERE clause. Placeholders are numbered from the current
 * length of `params` so the clause stays correct in every filter combination
 * (namespace only, q only, both, neither).
 */
function buildWhere(
  aliases: { n: string; k: string; t: string },
  params: unknown[],
  namespace: string | null,
  search: string | undefined,
): string {
  const parts: string[] = [];
  if (namespace) {
    params.push(namespace);
    parts.push(`${aliases.n}.code = ?${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    const p = params.length;
    parts.push(`(${aliases.k}.\`key\` LIKE ?${p} OR ${aliases.t}.value LIKE ?${p})`);
  }
  return parts.length ? ` WHERE ${parts.join(" AND ")}` : "";
}

export async function GET(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.I18N_VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const namespace = request.nextUrl.searchParams.get("namespace");
  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  const rawLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "", 10);
  const rawOffset = Number.parseInt(request.nextUrl.searchParams.get("offset") ?? "", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  const db = await getRuntimeDb();

  const countParams: unknown[] = [];
  const countWhere = buildWhere({ n: "n", k: "k", t: "t" }, countParams, namespace, search);
  const countRow = await db
    .prepare(
      `SELECT COUNT(DISTINCT k.id) AS total
       FROM i18n_keys k
       JOIN i18n_namespaces n ON n.id = k.namespace_id
       LEFT JOIN i18n_translations t ON t.key_id = k.id
       ${countWhere}`,
    )
    .bind(...countParams)
    .first<{ total: number }>();
  const total = Number(countRow?.total ?? 0);

  const params: unknown[] = [];
  const innerWhere = buildWhere({ n: "n2", k: "k2", t: "t2" }, params, namespace, search);
  params.push(limit);
  const limitPlaceholder = params.length;
  params.push(offset);
  const offsetPlaceholder = params.length;

  const result = await db
    .prepare(
      `SELECT n.code AS namespace, k.\`key\` AS \`key\`, k.description AS description,
              t.locale AS locale, t.value AS value, t.status AS status
       FROM i18n_keys k
       JOIN i18n_namespaces n ON n.id = k.namespace_id
       LEFT JOIN i18n_translations t ON t.key_id = k.id
       WHERE k.id IN (
         SELECT id FROM (
           SELECT DISTINCT k2.id AS id, n2.code AS ns_code, k2.\`key\` AS key_name
           FROM i18n_keys k2
           JOIN i18n_namespaces n2 ON n2.id = k2.namespace_id
           LEFT JOIN i18n_translations t2 ON t2.key_id = k2.id
           ${innerWhere}
           ORDER BY n2.code, k2.\`key\`
           LIMIT ?${limitPlaceholder} OFFSET ?${offsetPlaceholder}
         ) AS page_keys
       )
       ORDER BY n.code, k.\`key\`, t.locale`,
    )
    .bind(...params)
    .all<KeyRow>();

  const rows = result.results ?? [];
  const namespacesResult = await db.prepare("SELECT code FROM i18n_namespaces ORDER BY code").all<{ code: string }>();

  const staticBundles = new Map<Locale, Readonly<Record<string, string>>>(
    LOCALES.map((locale) => [locale, getStaticFlatBundle(locale)]),
  );
  const statics: Record<string, Record<Locale, boolean>> = {};
  for (const row of rows) {
    const fullKey = `${row.namespace}.${row.key}`;
    if (statics[fullKey]) continue;
    const entry = {} as Record<Locale, boolean>;
    for (const locale of LOCALES) {
      entry[locale] = (staticBundles.get(locale) ?? {})[fullKey] !== undefined;
    }
    statics[fullKey] = entry;
  }

  return NextResponse.json({
    namespaces: (namespacesResult.results ?? []).map((row) => row.code),
    keys: rows,
    total,
    limit,
    offset,
    statics,
    identity: { role: identity.role, permissions: identity.permissions },
  });
}

type CreateBody = {
  namespace?: string;
  key?: string;
  description?: string;
};

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.I18N_EDIT)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const namespace = typeof body.namespace === "string" ? body.namespace.trim() : "";
  const key = typeof body.key === "string" ? body.key.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() || null : null;

  if (!namespace || namespace.length > MAX_NAMESPACE_LENGTH || !NAME_PATTERN.test(namespace)) {
    return NextResponse.json({ error: "invalid_namespace" }, { status: 400 });
  }
  if (!key || key.length > MAX_KEY_LENGTH || !NAME_PATTERN.test(key)) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }

  const result = await createI18nKey(namespace, key, description);
  if (!result.created) {
    return NextResponse.json({ error: "key_exists" }, { status: 409 });
  }

  return NextResponse.json(
    { ok: true, key: { id: result.id, namespace, key, description } },
    { status: 201 },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
