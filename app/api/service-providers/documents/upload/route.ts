import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getProviderProfileByUserId } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";
import { detectImageMime } from "@/lib/properties/image-processing";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = process.env.VERIFICATION_UPLOAD_DIR || "/var/www/uploads/verifications";
const MAX_BYTES = 8 * 1024 * 1024;

function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d; // %PDF-
}

/**
 * Verification-document upload for the signed-in provider: PDF or image, up to
 * 8MB, stored under /uploads/verifications/. Returns the public URL for the
 * metadata POST that follows.
 */
export async function POST(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const profile = await getProviderProfileByUserId(identity.email);
  if (!profile) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "أرفق ملف PDF أو صورة" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "الملف أكبر من 8MB" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let ext: string | null = null;
  if (isPdf(buffer)) ext = "pdf";
  else {
    const mime = detectImageMime(buffer);
    if (mime === "png") ext = "png";
    else if (mime === "webp") ext = "webp";
    else if (mime === "jpeg") ext = "jpg";
  }
  if (!ext) {
    return NextResponse.json({ error: "الصيغة غير مدعومة — PDF أو JPG أو PNG أو WebP" }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `${crypto.randomUUID()}.${ext}`;
  await writeFile(join(UPLOAD_DIR, fileName), buffer);

  return NextResponse.json({ ok: true, url: `/uploads/verifications/${fileName}`, size: buffer.byteLength, mimeType: ext === "pdf" ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}` }, { status: 201 });
}
