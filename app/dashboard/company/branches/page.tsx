// ORGANIZATIONS_F3_WORKSPACE
'use client';
import { Suspense } from "react";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Trash2, Edit, MapPin, Phone, Mail } from 'lucide-react';
import Button from '@/src/components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { CompanyWorkspaceShell } from '@/src/components/company/CompanyWorkspaceShell';

interface Branch {
  id: string;
  nameAr: string | null;
  nameEn: string | null;
  countryCode: string | null;
  cityId: string | null;
  addressAr: string | null;
  phone: string | null;
  email: string | null;
  status: string;
}

function CompanyBranchesPageContent() {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get('org');
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nameAr: '', nameEn: '', countryCode: 'SA', cityId: '', addressAr: '', phone: '', email: '', status: 'active',
  });

  useEffect(() => {
    fetch(`/api/company/branches${organizationId ? `?org=${encodeURIComponent(organizationId)}` : ''}`)
      .then(res => res.json())
      .then(data => { if (data.success) setBranches(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const payload = editingId ? { id: editingId, organizationId, ...formData } : { organizationId, ...formData };
      const res = await fetch(`/api/company/branches${organizationId ? `?org=${encodeURIComponent(organizationId)}` : ''}`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (editingId) setBranches(prev => prev.map(b => b.id === editingId ? data.data : b));
        else setBranches(prev => [...prev, data.data]);
        setShowForm(false); setEditingId(null);
        setFormData({ nameAr: '', nameEn: '', countryCode: 'SA', cityId: '', addressAr: '', phone: '', email: '', status: 'active' });
      }
    } catch { alert('حدث خطأ'); }
  };

  const deleteBranch = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفرع؟')) return;
    try {
      const res = await fetch(`/api/company/branches?id=${id}${organizationId ? `&org=${encodeURIComponent(organizationId)}` : ''}`, { method: 'DELETE' });
      if (res.ok) setBranches(prev => prev.filter(b => b.id !== id));
    } catch { alert('حدث خطأ'); }
  };

  if (loading) {
    return <div className="container mx-auto p-8"><div className="h-64 bg-gray-200 animate-pulse rounded-xl" /></div>;
  }

  return (
    <CompanyWorkspaceShell activeTab="branches">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الفروع</h1>
          <p className="text-gray-500 text-sm">إدارة فروع شركتك</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ nameAr: '', nameEn: '', countryCode: 'SA', cityId: '', addressAr: '', phone: '', email: '', status: 'active' }); }}>
          <Plus className="w-4 h-4 mr-2" /> إضافة فرع
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle>{editingId ? 'تعديل فرع' : 'فرع جديد'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} placeholder="اسم الفرع (عربي)" className="p-2 border rounded-lg" required />
                <input type="text" value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} placeholder="اسم الفرع (إنجليزي)" className="p-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={formData.cityId} onChange={(e) => setFormData({ ...formData, cityId: e.target.value })} placeholder="المدينة" className="p-2 border rounded-lg" />
                <input type="text" value={formData.addressAr} onChange={(e) => setFormData({ ...formData, addressAr: e.target.value })} placeholder="العنوان" className="p-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="رقم الهاتف" className="p-2 border rounded-lg" />
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="البريد الإلكتروني" className="p-2 border rounded-lg" />
              </div>
              <div className="flex gap-4">
                <Button type="submit">{editingId ? 'تحديث' : 'إضافة'}</Button>
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>إلغاء</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {branches.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">لا توجد فروع</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{branch.nameAr || branch.nameEn}</h3>
                    {branch.cityId && <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {branch.cityId}</p>}
                    {branch.addressAr && <p className="text-sm text-gray-500">{branch.addressAr}</p>}
                    {branch.phone && <p className="text-sm text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {branch.phone}</p>}
                    {branch.email && <p className="text-sm text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {branch.email}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(branch.id); setFormData({ nameAr: branch.nameAr || '', nameEn: branch.nameEn || '', countryCode: branch.countryCode || 'SA', cityId: branch.cityId || '', addressAr: branch.addressAr || '', phone: branch.phone || '', email: branch.email || '', status: branch.status }); setShowForm(true); }} className="p-1 text-gray-400 hover:text-[var(--color-primary)]">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteBranch(branch.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CompanyWorkspaceShell>
  );
}

// F3_SUSPENSE_BOUNDARY
export default function CompanyBranchesPage() {
  return (
    <Suspense fallback={<div className="p-6" dir="rtl">جاري التحميل...</div>}>
      <CompanyBranchesPageContent />
    </Suspense>
  );
}
