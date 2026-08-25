'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Tag } from 'lucide-react';
import Button from '@/src/components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { CompanyWorkspaceShell } from '@/src/components/company/CompanyWorkspaceShell';

interface CompanyProfile {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  cityId: string;
  contactPhone: string;
  contactEmail: string;
  websiteUrl: string;
  logoUrl: string;
  coverUrl: string;
  specialties: string[];
}

export default function CompanyProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile>({
    nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '',
    cityId: '', contactPhone: '', contactEmail: '', websiteUrl: '',
    logoUrl: '', coverUrl: '', specialties: [],
  });
  const [newSpecialty, setNewSpecialty] = useState('');

  useEffect(() => {
    fetch('/api/company/profile')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const d = data.data;
          setProfile({
            nameAr: d.nameAr || '', nameEn: d.nameEn || '',
            descriptionAr: d.descriptionAr || '', descriptionEn: d.descriptionEn || '',
            cityId: d.cityId || '', contactPhone: d.contactPhone || '',
            contactEmail: d.contactEmail || '', websiteUrl: d.websiteUrl || '',
            logoUrl: d.logoUrl || '', coverUrl: d.coverUrl || '',
            specialties: d.specialties || [],
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const addSpecialty = () => {
    if (newSpecialty.trim()) {
      setProfile({ ...profile, specialties: [...profile.specialties, newSpecialty.trim()] });
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (index: number) => {
    setProfile({ ...profile, specialties: profile.specialties.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/company/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) { alert('تم تحديث الملف بنجاح'); router.refresh(); }
    } catch { alert('حدث خطأ'); } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="container mx-auto p-8"><div className="h-64 bg-gray-200 animate-pulse rounded-xl" /></div>;
  }

  return (
    <CompanyWorkspaceShell activeTab="profile">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الملف الشخصي</h1>
          <p className="text-gray-500 text-sm">تعديل معلومات شركتك</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>معلومات الشركة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">الاسم (عربي)</label>
                <input type="text" value={profile.nameAr} onChange={(e) => setProfile({ ...profile, nameAr: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الاسم (إنجليزي)</label>
                <input type="text" value={profile.nameEn} onChange={(e) => setProfile({ ...profile, nameEn: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الوصف (عربي)</label>
              <textarea value={profile.descriptionAr} onChange={(e) => setProfile({ ...profile, descriptionAr: e.target.value })} className="w-full p-2 border rounded-lg h-24" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الوصف (إنجليزي)</label>
              <textarea value={profile.descriptionEn} onChange={(e) => setProfile({ ...profile, descriptionEn: e.target.value })} className="w-full p-2 border rounded-lg h-24" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>التخصصات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input type="text" value={newSpecialty} onChange={(e) => setNewSpecialty(e.target.value)} placeholder="أضف تخصصاً" className="flex-1 p-2 border rounded-lg" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())} />
              <Button type="button" variant="secondary" onClick={addSpecialty}>
                <Tag className="w-4 h-4 mr-2" /> إضافة
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                  {s}
                  <button type="button" onClick={() => removeSpecialty(i)} className="hover:text-red-600">✕</button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>معلومات الاتصال</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                <input type="text" value={profile.contactPhone} onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                <input type="email" value={profile.contactEmail} onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الموقع الإلكتروني</label>
              <input type="text" value={profile.websiteUrl} onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })} className="w-full p-2 border rounded-lg" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving} className="flex-1">
            <Save className="w-4 h-4 mr-2" />{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>إلغاء</Button>
        </div>
      </form>
    </CompanyWorkspaceShell>
  );
}
