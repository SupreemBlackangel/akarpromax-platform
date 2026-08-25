import { getSponsorAssetsBucket } from "@/lib/runtime-assets";

/**
 * Object storage boundary for Office property media.
 *
 * This is NOT a second storage system: it resolves to the same canonical
 * `SPONSOR_ASSETS` R2 bucket that `/api/ad-assets` writes to. The indirection
 * exists only so deterministic tests can inject an in-memory bucket, exactly
 * like `setIntegrationDbForTesting` does for the database.
 */
let overrideBucket: R2Bucket | null = null;

export function setOfficeMediaBucketForTesting(bucket: R2Bucket | null): R2Bucket | null {
  overrideBucket = bucket;
  return bucket;
}

export async function getOfficeMediaBucket(): Promise<R2Bucket> {
  return overrideBucket ?? (await getSponsorAssetsBucket());
}
