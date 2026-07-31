import { requireChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

async function AdminDashboard() {
  const user = await requireChatGPTUser("/admin");
  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">لوحة الإحصاءات</h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-700 dark:text-gray-300 mb-4">مرحباً {user.displayName}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">-</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">الرعاة النشطون</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">-</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">الحملات النشطة</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">-</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي المستخدمين</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <AdminDashboard />;
}
