import type { NextRequest, NextResponse } from "next/server";

/**
 * Forward a compatibility route to its canonical handler.
 *
 * The `/api/services/*` family exists so older clients keep working while the
 * canonical routes live under `/api/service-*`. Each one used to re-issue the
 * request over HTTP to this same server:
 *
 *     fetch(new URL(canonicalPath, request.url), { method, headers, body })
 *
 * which meant every call cost a second full request — a second TLS-terminated
 * connection through nginx, the body buffered and streamed twice, the session
 * cookie re-parsed, and double the latency — to reach a function already loaded
 * in the same process.
 *
 * It also made a wrong path silently expensive rather than obviously broken:
 * `/api/services/orders/[id]` forwarded to `/api/service-orders/[id]`, which has
 * never existed, so the fetch 404'd and the proxy answered 500. Calling the
 * handler directly makes that a build error instead — you cannot import a
 * function that is not there.
 */
export type RouteHandler<Context = unknown> = (
  request: NextRequest,
  context: Context,
) => Promise<NextResponse | Response> | NextResponse | Response;

/**
 * Invoke the canonical handler in this process.
 *
 * The request object is passed through untouched, so authentication, headers
 * and body all behave exactly as they would on the canonical route — which is
 * the point of a compatibility alias.
 */
export async function forwardToCanonical<Context>(
  request: NextRequest,
  handler: RouteHandler<Context>,
  context: Context,
): Promise<Response> {
  return handler(request, context);
}
