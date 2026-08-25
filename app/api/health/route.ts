import { checkHealth } from '@/lib/health/health.service';

export async function GET() {
  const health = await checkHealth();
  return new Response(JSON.stringify(health), {
    status: health.status === 'healthy' ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
