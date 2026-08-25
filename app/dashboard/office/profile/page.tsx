// ORGANIZATIONS_F3_WORKSPACE
'use client';
import { Suspense } from "react";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save } from 'lucide-react';
import Button from '@/src/components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { OfficeWorkspaceShell } from '@/src/components/office/OfficeWorkspaceShell';

interface OfficeProfile {
  nameAr: string | null;
  nameEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  countryCode: string | null;
  cityId: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
}

function OfficeProfilePageContent() {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get('org');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<OfficeProfile>({
    nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '',
    countryCode: '', cityId: '', contactPhone: '', contactEmail: '',
    websiteUrl: '', logoUrl: '', coverUrl: '',
  });

  useEffect(() => {
    fetch(`/api/office/profile${organizationId ? `?org=${encodeURIComponent(organizationId)}` : ''}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const d = data.data;
          setProfile({
            nameAr: d.nameAr || '', nameEn: d.nameEn || '',
            descriptionAr: d.descriptionAr || '', descriptionEn: d.descriptionEn || '',
            countryCode: d.countryCode || '', cityId: d.cityId || '',
            contactPhone: d.contactPhone || '', contactEmail: d.contactEmail || '',
            websiteUrl: d.websiteUrl || '', logoUrl: d.logoUrl || '', coverUrl: d.coverUrl || '',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/office/profile${organizationId ? `?org=${encodeURIComponent(organizationId)}` : ''}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, organizationId }),
      });
      if (res.ok) {
        alert('تم تحديث الملف بنجاح');
        router.refresh();
      }
    } catch {
      alert('حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-8"><div className="h-64 bg-gray-200 animate-pulse rounded-xl" /></div>;
  }

  return (
    <OfficeWorkspaceShell activeTab="profile">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الملف الشخصي</h1>
          <p className="text-gray-500 text-sm">تعديل معلومات مكتبك العقاري</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>معلومات المكتب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم المكتب (عربي)</label>
                <input type="text" value={profile.nameAr || ''} onChange={(e) => setProfile({ ...profile, nameAr: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">اسم المكتب (إنجليزي)</label>
                <input type="text" value={profile.nameEn || ''} onChange={(e) => setProfile({ ...profile, nameEn: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الوصف (عربي)</label>
              <textarea value={profile.descriptionAr || ''} onChange={(e) => setProfile({ ...profile, descriptionAr: e.target.value })} className="w-full p-2 border rounded-lg h-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">الدولة</label>
                <input type="text" value={profile.countryCode || ''} onChange={(e) => setProfile({ ...profile, countryCode: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">المدينة</label>
                <input type="text" value={profile.cityId || ''} onChange={(e) => setProfile({ ...profile, cityId: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>معلومات الاتصال</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                <input type="text" value={profile.contactPhone || ''} onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                <input type="email" value={profile.contactEmail || ''} onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الموقع الإلكتروني</label>
              <input type="text" value={profile.websiteUrl || ''} onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })} className="w-full p-2 border rounded-lg" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            إلغاء
          </Button>
        </div>
      </form>
    </OfficeWorkspaceShell>
  );
}

// F3_SUSPENSE_BOUNDARY
export default function OfficeProfilePage() {
  return (
    <Suspense fallback={<div className="p-6" dir="rtl">جاري التحميل...</div>}>
      <OfficeProfilePageContent />
    </Suspense>
  );
}
