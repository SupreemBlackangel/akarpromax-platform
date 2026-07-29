export async function getRuntimeDb(): Promise<D1Database> {
  const runtime = await import("cloudflare:workers");
  if (!runtime.env.DB) throw new Error("Database binding is unavailable");
  return runtime.env.DB;
}
