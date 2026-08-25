export async function getSponsorAssetsBucket(): Promise<R2Bucket> {
  const runtime = await import("cloudflare:workers");
  if (!runtime.env.SPONSOR_ASSETS) throw new Error("Sponsor asset storage is unavailable");
  return runtime.env.SPONSOR_ASSETS;
}
