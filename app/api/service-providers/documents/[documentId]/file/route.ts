import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getProviderDocument, getProviderProfileByUserId } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";
import { contentTypeFor, documentPath, storedFileName } from "@/lib/services/verification/document-storage";

export const dynamic = "force-dynamic";

/**
 * Serve one verification document to the people entitled to see it.
 *
 * Until this existed, verification could not complete at all. The upload route
 * wrote the file to /var/www/uploads/verifications/ and returned
 * `/uploads/verifications/<uuid>.<ext>`, but nothing served that path: nginx
 * proxies everything under /uploads/ except /uploads/properties/ to the
 * application, and the application had no handler there. Every such URL
 * answered 404 -- forever, for everyone. A provider could not see the document
 * they had just uploaded, and an admin could not review it, so no provider
 * could ever be approved and no Verified badge could ever be earned.
 *
 * The fix is not to serve the directory statically. These are identity papers
 * and trade licences; a UUID in a URL is obscurity, not access control, and the
 * URL is stored in a database row that several people can read. Access is
 * decided here, per request, from the document's own owner.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;

  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }

  const document = await getProviderDocument(documentId);
  // A missing document and a forbidden one answer alike: telling an unauthorized
  // caller that a document id exists is itself a disclosure.
  const deny = () => NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  if (!document) return deny();

  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_PROVIDERS_REVIEW)) {
    const ownProfile = await getProviderProfileByUserId(identity.email);
    if (!ownProfile || String(ownProfile.id) !== String(document.provider_id)) return deny();
  }

  const path = documentPath(document.file_url);
  const name = storedFileName(document.file_url);
  if (!path || !name) {
    // The row points somewhere that is not one of our stored documents.
    return NextResponse.json({ error: "Document is not available" }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch {
    return NextResponse.json({ error: "Document is not available" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypeFor(name),
      // Never let a browser guess a different type for an attacker-supplied
      // file, and never let a shared cache keep someone's identity papers.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${name}"`,
    },
  });
}
