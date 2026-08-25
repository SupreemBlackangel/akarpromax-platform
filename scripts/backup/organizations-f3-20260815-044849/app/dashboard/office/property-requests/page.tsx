import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { propertyRequestOffers, propertyRequests } from "@/lib/db/schemas/properties-schema";
import { organizationMembers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";
import Button from "@/src/components/ui/Button";

export const dynamic = "force-dynamic";

const DEAL_LABELS: Record<string, string> = {
  sale: "شراء",
  rent: "إيجار",
};

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  matched: "تمت المطابقة",
  closed: "مغلق",
};

async function getUserOfficeId(userId: string): Promise<string | null> {
  const { db, end } = getDb();
  try {
    const [member] = await db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")))
      .limit(1);
    return member?.organizationId ?? null;
  } finally {
    await end();
  }
}

function formatBudget(value: string | null): string {
  return Number(value ?? 0).toLocaleString("en-US");
}

export default async function OfficePropertyRequestsPage() {
  const session = await getSession();
  if (!session) {
    return (
      <OfficeWorkspaceShell activeTab="property-requests">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          غير مصرح — سجّل الدخول للوصول إلى مكتبك العقاري.
        </div>
      </OfficeWorkspaceShell>
    );
  }

  const officeId = await getUserOfficeId(session.userId);
  if (!officeId) {
    return (
      <OfficeWorkspaceShell activeTab="property-requests">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          ليس لديك مكتب عقاري مرتبط بحسابك.
        </div>
      </OfficeWorkspaceShell>
    );
  }

  const { db, end } = getDb();
  let rows: Array<{ request: typeof propertyRequests.$inferSelect; offer: typeof propertyRequestOffers.$inferSelect }>;
  try {
    rows = await db
      .select({
        request: propertyRequests,
        offer: propertyRequestOffers,
      })
      .from(propertyRequestOffers)
      .innerJoin(propertyRequests, eq(propertyRequestOffers.requestId, propertyRequests.id))
      .where(eq(propertyRequestOffers.officeId, officeId))
      .orderBy(desc(propertyRequestOffers.createdAt));
  } finally {
    await end();
  }

  return (
    <OfficeWorkspaceShell activeTab="property-requests">
      <div className="mb-5">
        <h2 className="font-black text-gray-900 dark:text-white">طلبات العقار</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">طلبات العملاء التي قدّم مكتبك عروضًا عليها</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          <p>لا توجد طلبات عقار واردة.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(({ request, offer }) => (
            <div key={request.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {DEAL_LABELS[request.dealType] ?? request.dealType} · {request.propertyType}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                        request.status === "active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {STATUS_LABELS[request.status ?? "active"] ?? request.status}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      عرضك: {offer.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {request.governorate} · {request.city}
                    {request.district ? ` · ${request.district}` : ""}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    الميزانية: {formatBudget(request.budget)} ريال
                    {request.area ? ` · ${formatBudget(request.area)} م²` : ""}
                    {request.bedrooms ? ` · ${request.bedrooms} غرف` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/office/property-requests/${request.id}`}>
                    <Button variant="secondary" size="sm">عرض التفاصيل</Button>
                  </Link>
                  <Link href={`/dashboard/office/offers/new?requestId=${request.id}`}>
                    <Button variant="primary" size="sm">تقديم عرض</Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </OfficeWorkspaceShell>
  );
}
