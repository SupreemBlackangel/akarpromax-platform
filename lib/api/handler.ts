import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { getSession } from "@/lib/auth/session";
import { ApiError } from "@/lib/errors/api-error";
import { hasPermission } from "@/lib/rbac/check";

type HandlerOptions<T> = {
  requiredPermission?: string;
  bodySchema?: ZodSchema<T>;
};

export function apiHandler<T = unknown>(
  options: HandlerOptions<T>,
  fn: (req: NextRequest, ctx: { session: Awaited<ReturnType<typeof getSession>>; body: T }) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
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

      return await fn(req, { session, body });
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      console.error("Unhandled API error:", err);
      return NextResponse.json({ error: "خطأ داخلي في الخادم" }, { status: 500 });
    }
  };
}
