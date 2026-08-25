import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";

import { getSession } from "@/lib/auth/session";
import { ApiError } from "@/lib/errors/api-error";
import { hasPermission } from "@/lib/rbac/check";
import { createRequestId } from "@/lib/security/audit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { assertSafeOrigin } from "@/lib/security/origin";

type HandlerOptions<T> = {
  requiredPermission?: string;
  bodySchema?: ZodSchema<T>;
};

type HandlerContext<T> = {
  session: Awaited<ReturnType<typeof getSession>>;
  body: T;
  requestId: string;
};

export function apiHandler<T = unknown>(
  options: HandlerOptions<T>,
  fn: (req: NextRequest, ctx: HandlerContext<T>) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    const requestId = createRequestId();
    try {
      assertSafeOrigin(req);

      const session = await getSession();

      if (options.requiredPermission) {
        if (!session) throw new ApiError(401, "غير مصرّح بالدخول");
        if (!hasPermission(session.permissions, options.requiredPermission)) {
          throw new ApiError(403, "لا تملك صلاحية تنفيذ هذا الإجراء");
        }
      }

      let body = {} as T;
      if (options.bodySchema) {
        const raw = await req.json().catch(() => ({}));
        const parsed = options.bodySchema.safeParse(raw);
        if (!parsed.success) {
          throw new ApiError(400, "بيانات غير صالحة", "VALIDATION_ERROR");
        }
        body = parsed.data;
      }

      return await fn(req, { session, body, requestId });
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          {
            error: err.message,
            code: err.code,
            requestId,
            ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
          },
          applySecurityHeaders({ status: err.status }),
        );
      }
      // Never log the full error: it may embed SQL, table names, or stack
      // traces. Correlation happens via requestId (see SECURITY_HEADERS_POLICY).
      console.error(`[api:${requestId}] unhandled API error: ${err instanceof Error ? err.name : "unknown"}`);
      return NextResponse.json(
        { error: "خطأ داخلي في الخادم", code: "INTERNAL_ERROR", requestId },
        applySecurityHeaders({ status: 500 }),
      );
    }
  };
}
