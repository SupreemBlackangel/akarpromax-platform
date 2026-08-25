import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { properties } from "@/lib/db/schemas/properties-schema";
import { organizationMembers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";
import Button from "@/src/components/ui/Button";

export const dynamic = "force-dynamic";

const DEAL_LABELS: Record<string, string> = {
  sale: "بيع",
  rent: "إيجار",
  mortgage: "رهن",
  exchange: "بدل",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  pending_review: "قيد المراجعة",
  active: "منشور",
  rejected: "مرفوض",
  archived: "مؤرشف",
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

function formatPrice(value: string | number | null): string {
  return Number(value ?? 0).toLocaleString("en-US");
}

export default async function OfficePropertiesPage() {
  const session = await getSession();
  if (!session) {
    return (
      <OfficeWorkspaceShell activeTab="properties">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          غير مصرح — سجّل الدخول للوصول إلى مكتبك العقاري.
        </div>
      </OfficeWorkspaceShell>
    );
  }

  const officeId = await getUserOfficeId(session.userId);
  if (!officeId) {
    return (
      <OfficeWorkspaceShell activeTab="properties">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          ليس لديك مكتب عقاري مرتبط بحسابك.
        </div>
      </OfficeWorkspaceShell>
    );
  }

  const { db, end } = getDb();
  let rows: typeof properties.$inferSelect[];
  try {
    rows = await db
      .select()
      .from(properties)
      .where(eq(properties.officeId, officeId))
      .orderBy(desc(properties.createdAt));
  } finally {
    await end();
  }

  return (
    <OfficeWorkspaceShell activeTab="properties">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-gray-900 dark:text-white">عقارات المكتب</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">إدارة العقارات المرتبطة بمكتبك العقاري</p>
        </div>
        <Link href="/dashboard/properties/new">
          <Button variant="primary" size="sm">+ إضافة عقار</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          <p>لا توجد عقارات في المكتب بعد.</p>
          <Link href="/dashboard/properties/new" className="mt-4 inline-block">
            <Button variant="primary" size="sm">أضف عقارك الأول</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-gray-900 dark:text-white">{property.titleAr}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                    property.status === "active"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : property.status === "rejected"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {STATUS_LABELS[property.status ?? "draft"] ?? property.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {DEAL_LABELS[property.dealType] ?? property.dealType} · {property.propertyType} · {property.city}
              </p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-black text-blue-700 dark:text-blue-300">
                  {formatPrice(property.price)} {property.currency ?? "SAR"}
                </span>
                <span className="text-gray-400">{formatPrice(property.area)} م²</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </OfficeWorkspaceShell>
  );
}
