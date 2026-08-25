'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PermissionGuard } from '@/src/components/PermissionGuard';
import { PERMISSIONS } from '@/src/constants/permissions';

// Module-level so the array identity is stable: PermissionGuard keys its
// permission check off this prop, and a fresh literal on every render would
// re-run the check in a loop.
const REQUIRED = [PERMISSIONS.ADS_VIEW];

export default function AdminAdvertisingPage() {
  return (
    <PermissionGuard requiredPermissions={REQUIRED}>
      <AdvertisingDashboard />
    </PermissionGuard>
  );
}

function AdvertisingDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ campaigns: 0, creatives: 0, news: 0, featured: 0, impressions: 0, clicks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/advertising/stats')
      .then(res => res.json())
      .then(data => { if (data.success) setStats(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">إدارة الإعلانات</h1>
      {loading ? <p>جاري التحميل...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--color-surface)] rounded-lg shadow p-4 text-center"><h3 className="text-2xl font-bold text-[var(--color-primary)]">{stats.campaigns}</h3><p className="text-gray-500">الحملات</p></div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow p-4 text-center"><h3 className="text-2xl font-bold text-green-600">{stats.creatives}</h3><p className="text-gray-500">المحتوى الإبداعي</p></div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow p-4 text-center"><h3 className="text-2xl font-bold text-purple-600">{stats.news}</h3><p className="text-gray-500">الشريط الإخباري</p></div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow p-4 text-center"><h3 className="text-2xl font-bold text-yellow-600">{stats.featured}</h3><p className="text-gray-500">العقارات المميزة</p></div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow p-4 text-center"><h3 className="text-2xl font-bold text-[var(--color-primary)]">{stats.impressions}</h3><p className="text-gray-500">مرات الظهور</p></div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow p-4 text-center"><h3 className="text-2xl font-bold text-red-600">{stats.clicks}</h3><p className="text-gray-500">النقرات</p></div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <button onClick={() => router.push('/admin/advertising/campaigns')} className="p-4 bg-[var(--color-primary-soft)] rounded-lg hover:bg-[var(--color-primary-soft)] text-[var(--color-primary)]">إدارة الحملات</button>
        <button onClick={() => router.push('/admin/advertising/news-ticker')} className="p-4 bg-green-50 rounded-lg hover:bg-green-100 text-green-700">إدارة الشريط الإخباري</button>
        <button onClick={() => router.push('/admin/advertising/featured')} className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 text-yellow-700">إدارة العقارات المميزة</button>
        <button onClick={() => router.push('/admin/advertising/analytics')} className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 text-purple-700">الإحصائيات</button>
      </div>
    </div>
  );
}
