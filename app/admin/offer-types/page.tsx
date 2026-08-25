'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus, Edit, Eye, EyeOff } from 'lucide-react';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import { PermissionGuard } from '@/src/components/PermissionGuard';
import { PERMISSIONS } from '@/src/constants/permissions';

// Editing offer types is property configuration, so it takes the property
// management permission. The page used to render for anyone who knew the URL.
// Module-level for a stable array identity (see PermissionGuard's effect).
const REQUIRED = [PERMISSIONS.PROPERTIES_MANAGE];

interface OfferType {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  displayOrder: number;
  isActive: boolean;
  allowDirect: boolean;
  allowAuction: boolean;
  contractTemplateType: string | null;
}

export default function OfferTypesAdminPage() {
  return (
    <PermissionGuard requiredPermissions={REQUIRED}>
      <OfferTypesAdmin />
    </PermissionGuard>
  );
}

function OfferTypesAdmin() {
  const router = useRouter();
  const { viewer } = useServicesPage({ loadI18n: false });
  const [types, setTypes] = useState<OfferType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', nameAr: '', nameEn: '', displayOrder: 0, isActive: true, allowDirect: true, allowAuction: true, contractTemplateType: '' });

  useEffect(() => {
    fetch('/api/admin/offer-types').then(r => r.json()).then(d => {
      if (d.success) setTypes(d.data);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PATCH' : 'POST';
    const payload = editingId ? { id: editingId, ...form } : form;
    const res = await fetch('/api/admin/offer-types', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (editingId) setTypes(prev => prev.map(t => t.id === editingId ? data.data : t));
      else setTypes(prev => [...prev, data.data]);
      setEditingId(null);
      setForm({ code: '', nameAr: '', nameEn: '', displayOrder: 0, isActive: true, allowDirect: true, allowAuction: true, contractTemplateType: '' });
    }
  };

  if (loading) return <div className="container mx-auto p-8"><div className="h-64 bg-gray-200 animate-pulse rounded-xl" /></div>;

  return (
    <div className="container mx-auto p-4 md:p-8" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">أنواع العروض</h1>
          <p className="text-gray-500 text-sm">إدارة أنواع العروض العقارية (11 نوع)</p>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl shadow p-6 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">{editingId ? 'تعديل نوع' : 'نوع جديد'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="الكود (SALE)" className="p-2 border rounded-lg" required disabled={!!editingId} />
          <input type="text" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} placeholder="الاسم عربي" className="p-2 border rounded-lg" required />
          <input type="text" value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} placeholder="الاسم إنجليزي" className="p-2 border rounded-lg" required />
          <input type="text" value={form.contractTemplateType} onChange={e => setForm({ ...form, contractTemplateType: e.target.value })} placeholder="قالب العقد" className="p-2 border rounded-lg" />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> نشط</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowDirect} onChange={e => setForm({ ...form, allowDirect: e.target.checked })} /> مباشر</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowAuction} onChange={e => setForm({ ...form, allowAuction: e.target.checked })} /> مزاد</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex items-center gap-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-bold hover:bg-[var(--color-primary-hover)]">
              <Save className="w-4 h-4" /> {editingId ? 'تحديث' : 'إضافة'}
            </button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ code: '', nameAr: '', nameEn: '', displayOrder: 0, isActive: true, allowDirect: true, allowAuction: true, contractTemplateType: '' }); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">إلغاء</button>}
          </div>
        </form>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right font-bold text-gray-600">الكود</th>
              <th className="px-4 py-3 text-right font-bold text-gray-600">الاسم</th>
              <th className="px-4 py-3 text-right font-bold text-gray-600">القالب</th>
              <th className="px-4 py-3 text-right font-bold text-gray-600">مباشر</th>
              <th className="px-4 py-3 text-right font-bold text-gray-600">مزاد</th>
              <th className="px-4 py-3 text-right font-bold text-gray-600">الحالة</th>
              <th className="px-4 py-3 text-right font-bold text-gray-600">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {types.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs font-bold">{t.code}</td>
                <td className="px-4 py-3">{t.nameAr} / {t.nameEn}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{t.contractTemplateType}</td>
                <td className="px-4 py-3">{t.allowDirect ? '✅' : '—'}</td>
                <td className="px-4 py-3">{t.allowAuction ? '✅' : '—'}</td>
                <td className="px-4 py-3">{t.isActive ? <span className="text-green-600">نشط</span> : <span className="text-gray-400">معطل</span>}</td>
                <td className="px-4 py-3">
                  <button onClick={() => { setEditingId(t.id); setForm({ code: t.code, nameAr: t.nameAr, nameEn: t.nameEn, displayOrder: t.displayOrder, isActive: t.isActive, allowDirect: t.allowDirect, allowAuction: t.allowAuction, contractTemplateType: t.contractTemplateType || '' }); }} className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"><Edit className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
