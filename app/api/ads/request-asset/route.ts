import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";

export const dynamic = "force-dynamic";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function hasValidSignature(bytes: Uint8Array, type: string) {
  if (type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
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
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !ALLOWED.has(file.type) || file.size < 1 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Upload a JPG, PNG or WebP image up to 5 MB" }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidSignature(bytes, file.type)) return NextResponse.json({ error: "Invalid image file" }, { status: 400 });
  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "ad-image";
  const db = await ensureTable();
  await db.prepare("INSERT INTO ad_request_assets (id,file_name,content_type,size_bytes,file_data) VALUES (?1,?2,?3,?4,?5)")
    .bind(id, safeName, file.type, file.size, bytes).run();
  return NextResponse.json({ asset: { id, url: `/api/ads/request-asset?id=${id}` } }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const db = await ensureTable();
  const row = await db.prepare("SELECT content_type,file_data FROM ad_request_assets WHERE id=?1 LIMIT 1").bind(id).first<{ content_type: string; file_data: ArrayBuffer | Uint8Array }>();
  if (!row) return new NextResponse(null, { status: 404 });
  return new NextResponse(row.file_data as BodyInit, { headers: { "Content-Type": row.content_type, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
