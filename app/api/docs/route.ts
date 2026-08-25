const openapiSpec = {
  openapi: '3.0.0',
  info: { title: 'AkarProMax API', version: '2.0.0', description: 'Real Estate & Services Platform API' },
  paths: {
    '/api/auth/login': { post: { summary: 'Login' } },
    '/api/properties': { get: { summary: 'List properties' } },
    '/api/professionals': { get: { summary: 'List professionals' } },
    '/api/offices': { get: { summary: 'List offices' } },
    '/api/companies': { get: { summary: 'List companies' } },
    '/api/health': { get: { summary: 'Health check' } },
  },
};

export async function GET() {
  return new Response(JSON.stringify(openapiSpec), { headers: { 'Content-Type': 'application/json' } });
}
