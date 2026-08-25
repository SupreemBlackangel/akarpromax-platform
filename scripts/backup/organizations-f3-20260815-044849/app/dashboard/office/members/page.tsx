import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";
import Button from "@/src/components/ui/Button";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  owner: "مالك",
  admin: "مدير",
  manager: "مسؤول",
  agent: "وكيل عقاري",
  member: "عضو",
};

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  inactive: "موقوف",
  pending: "معلق",
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

export default async function OfficeMembersPage() {
  const session = await getSession();
  if (!session) {
    return (
      <OfficeWorkspaceShell activeTab="members">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          غير مصرح — سجّل الدخول للوصول إلى مكتبك العقاري.
        </div>
      </OfficeWorkspaceShell>
    );
  }

  const officeId = await getUserOfficeId(session.userId);
  if (!officeId) {
    return (
      <OfficeWorkspaceShell activeTab="members">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          ليس لديك مكتب عقاري مرتبط بحسابك.
        </div>
      </OfficeWorkspaceShell>
    );
  }

  const { db, end } = getDb();
  let rows: Array<{ organization_members: typeof organizationMembers.$inferSelect; users: typeof users.$inferSelect }>;
  try {
    rows = await db
      .select()
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, officeId))
      .orderBy(desc(organizationMembers.joinedAt));
  } finally {
    await end();
  }

  return (
    <OfficeWorkspaceShell activeTab="members">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-gray-900 dark:text-white">أعضاء المكتب</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">إدارة أعضاء ووكلاء المكتب العقاري</p>
        </div>
        <Link href="/dashboard/office/members/invite">
          <Button variant="primary" size="sm">+ دعوة عضو</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          <p>لا يوجد أعضاء في المكتب.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">العضو</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">الدور</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">البريد</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ organization_members: orgMember, users: user }) => (
                <tr key={orgMember.id} className="border-b border-gray-50 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                        {user.name?.[0] ?? "م"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">{user.name ?? "—"}</p>
                        <p className="text-xs text-gray-400">انضم {orgMember.joinedAt.toLocaleDateString("ar")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {ROLE_LABELS[orgMember.role] ?? orgMember.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{user.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm ${
                        orgMember.status === "active"
                          ? "text-green-600 dark:text-green-400"
                          : orgMember.status === "pending"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {STATUS_LABELS[orgMember.status] ?? orgMember.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OfficeWorkspaceShell>
  );
}
