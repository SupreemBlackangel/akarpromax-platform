import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { enforceRateLimit, clientIp } from "@/lib/security/rate-limit";
import { processAdImage } from "@/lib/ads/image-processing";
import { maybePruneAdRequestAssets } from "@/lib/ads/asset-retention";
import { matchesFileSignature } from "@/lib/security/file-signatures";

export const dynamic = "force-dynamic";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Whether the bytes match the declared type.
 *
 * Delegates to lib/security/file-signatures.ts. The copy that was here checked
 * only PNG's first four bytes.
 */
function hasValidSignature(bytes: Uint8Array, type: string) {
  return matchesFileSignature(bytes, type);
}

async function ensureTable() {
  const db = await getRuntimeDb();
  // Postgres-native types on purpose: the production runtime is Postgres behind
  // the D1-style adapter (lib/pg-runtime.ts translateSql), which rewrites
  // DATETIME but knows nothing about MySQL's LONGBLOB. BYTEA is the correct
  // Postgres binary column, and postgres-js infers the bytea OID for any bound
  // Uint8Array (node_modules/postgres/src/types.js), so binding raw bytes
  // through the adapter works. SQLite/D1 dev mode stores the blob regardless of
  // the declared column type thanks to type affinity.
  await db.prepare(`CREATE TABLE IF NOT EXISTS ad_request_assets (
    id VARCHAR(36) PRIMARY KEY NOT NULL, file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(64) NOT NULL, size_bytes INT NOT NULL,
    file_data BYTEA NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  return db;
}

export async function POST(request: NextRequest) {
  // Public endpoint that writes image bytes into the database: without a limit
  // anyone could fill the table with 5 MB blobs.
  const rate = await enforceRateLimit("ads_request_asset", clientIp(request), request.nextUrl.pathname);
  if (!rate.allowed) {
    return NextResponse.json({ error: "محاولات كثيرة، حاول لاحقاً" }, { status: 429 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !ALLOWED.has(file.type) || file.size < 1 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Upload a JPG, PNG or WebP image up to 5 MB" }, { status: 400 });
  }
  const rawBytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidSignature(rawBytes, file.type)) return NextResponse.json({ error: "Invalid image file" }, { status: 400 });

  // Optimize before storing: these bytes live in the database and are streamed
  // back on every render, so an unprocessed upload is paid for on every view.
  const processed = await processAdImage(Buffer.from(rawBytes));
  if (!processed) return NextResponse.json({ error: "Invalid image file" }, { status: 400 });
  const bytes = new Uint8Array(processed.buffer);

  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "ad-image";
  const db = await ensureTable();
  await db.prepare("INSERT INTO ad_request_assets (id,file_name,content_type,size_bytes,file_data) VALUES (?1,?2,?3,?4,?5)")
    .bind(id, safeName, processed.contentType, bytes.byteLength, bytes).run();
  // These bytes live in the primary database, its backups and its replication
  // stream, and nothing ever removed them. Sweep old, unreferenced uploads.
  maybePruneAdRequestAssets(db);
  return NextResponse.json({
    asset: {
      id,
      url: `/api/ads/request-asset?id=${id}`,
      width: processed.width,
      height: processed.height,
    },
  }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const db = await ensureTable();
  const row = await db.prepare("SELECT content_type,file_data FROM ad_request_assets WHERE id=?1 LIMIT 1").bind(id).first<{ content_type: string; file_data: ArrayBuffer | Uint8Array }>();
  if (!row) return new NextResponse(null, { status: 404 });
  return new NextResponse(row.file_data as BodyInit, { headers: { "Content-Type": row.content_type, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
