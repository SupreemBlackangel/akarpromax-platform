'use client';
import { useState, useEffect } from 'react';
import { Trash2, Bell, BellOff } from 'lucide-react';
import DashboardPageShell from '@/src/components/dashboard/DashboardPageShell';
import type { savedSearches } from '@/lib/db/schemas/properties-schema';

type SavedSearchRow = typeof savedSearches.$inferSelect;

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [filters, setFilters] = useState({ dealType: '', category: '', city: '', minPrice: '', maxPrice: '' });

  const fetchSearches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/properties/saved-searches');
      const data = await res.json();
      if (data.success) setSearches(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { (async () => { await fetchSearches(); })(); }, []);

  const saveSearch = async () => {
    if (!name.trim()) return;
    await fetch('/api/properties/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, filters, notify: true }),
    });
    setName('');
    setFilters({ dealType: '', category: '', city: '', minPrice: '', maxPrice: '' });
    setShowForm(false);
    fetchSearches();
  };

  const deleteSearch = async (id: string) => {
    await fetch(`/api/properties/saved-searches?id=${id}`, { method: 'DELETE' });
    setSearches(prev => prev.filter((s) => s.id !== id));
  };

  return (
    <DashboardPageShell
      currentPath="/dashboard/properties/saved-searches"
      title={{ ar: 'بحوثي المحفوظة', en: 'Saved searches', tr: 'Kayıtlı aramalar' }}
      description={{ ar: 'احفظ معايير بحثك واستقبل تنبيهات بالجديد', en: 'Save your search criteria and get alerts', tr: 'Arama kriterlerinizi kaydedin, uyarı alın' }}
      actions={
        <button onClick={() => setShowForm(!showForm)} className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)]">
          + حفظ بحث جديد
        </button>
      }
    >
      {showForm && (
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-4 mb-6">
          <input type="text" placeholder="اسم البحث" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select value={filters.dealType} onChange={(e) => setFilters({ ...filters, dealType: e.target.value })} className="p-2 border rounded">
              <option value="">نوع الصفقة</option>
              <option value="sale">للبيع</option>
              <option value="rent">للإيجار</option>
            </select>
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="p-2 border rounded">
              <option value="">الفئة</option>
              <option value="residential">سكني</option>
              <option value="commercial">تجاري</option>
              <option value="land">أرض</option>
            </select>
            <input type="text" placeholder="المدينة" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} className="p-2 border rounded" />
            <input type="number" placeholder="الحد الأدنى" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} className="p-2 border rounded" />
            <input type="number" placeholder="الحد الأعلى" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} className="p-2 border rounded" />
          </div>
          <button onClick={saveSearch} className="mt-3 rounded-xl bg-[var(--color-success)] px-4 py-2 text-sm font-bold text-white hover:opacity-90">حفظ</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />)}</div>
      ) : searches.length === 0 ? (
        <div className="text-center py-12 text-gray-500"><p>لا توجد بحوث محفوظة</p></div>
      ) : (
        <div className="space-y-3">
          {searches.map((s) => (
            <div key={s.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                <p className="text-sm text-gray-500">{JSON.stringify(s.filters)}</p>
              </div>
              <div className="flex gap-2">
                {s.notify ? <Bell className="w-5 h-5 text-[var(--color-primary)]" /> : <BellOff className="w-5 h-5 text-gray-400" />}
                <button onClick={() => deleteSearch(s.id)} className="text-red-500 hover:text-[var(--color-error)]"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardPageShell>
  );
}
