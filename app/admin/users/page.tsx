import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

async function UsersGate() {
  const user = await requireChatGPTUser("/admin/users");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.USERS_VIEW]}>
      <div className="max-w-4xl mx-auto p-6" dir="rtl">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">إدارة المستخدمين</h1>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-500 dark:text-gray-400">سيتم تفعيل هذه الصفحة قريباً</p>
        </div>
      </div>
    </PermissionGuard>
  );
}

export default function UsersPage() {
  return <UsersGate />;
}
