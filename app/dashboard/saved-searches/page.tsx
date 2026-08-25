'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Bell, BellOff, Trash2, Search, Clock } from 'lucide-react';
import Button from '@/src/components/ui/Button';
import Card, { CardContent } from '@/src/components/ui/Card';
import PublicPageShell from '@/src/components/public/public-page-shell-client';
import { useServicesPage } from '@/src/components/services/useServicesPage';

interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  notify: boolean;
  matchCount: number;
  createdAt: string;
}

export default function SavedSearchesPage() {
  const router = useRouter();
  const { viewer, copy, locale, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/saved-searches')
      .then(res => res.json())
      .then(data => {
        if (data.success) setSearches(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const deleteSearch = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا البحث؟')) return;
    try {
      const res = await fetch(`/api/saved-searches/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSearches(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Error deleting search:', error);
    }
  };

  const toggleNotification = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/saved-searches/${id}/notify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify: !current }),
      });
      if (res.ok) {
        setSearches(prev => prev.map(s =>
          s.id === id ? { ...s, notify: !current } : s
        ));
      }
    } catch (error) {
      console.error('Error toggling notification:', error);
    }
  };

  const formatFilters = (filters: Record<string, unknown>) => {
    const parts: string[] = [];
    if (filters.dealType) parts.push(filters.dealType === 'sale' ? 'بيع' : 'إيجار');
    if (filters.city) parts.push(String(filters.city));
    if (filters.minPrice) parts.push(`من ${Number(filters.minPrice).toLocaleString()} ريال`);
    if (filters.maxPrice) parts.push(`إلى ${Number(filters.maxPrice).toLocaleString()} ريال`);
    return parts.join(' • ') || 'جميع العقارات';
  };

  if (loading) {
    return (
      <PublicPageShell viewer={viewer} copy={copy} locale={locale} country={country} city={city} onLogin={() => openLogin()} onLogout={handleLogout} currentPath="/dashboard">
        <div className="container mx-auto p-8">
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-xl" />)}
          </div>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell viewer={viewer} copy={copy} locale={locale} country={country} city={city} onLogin={() => openLogin()} onLogout={handleLogout} currentPath="/dashboard">
      <div className="container mx-auto px-4 py-6 max-w-4xl" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">البحث المحفوظ</h1>
            <p className="text-gray-500 text-sm">ادارة بحوثك المحفوظة وتنبيهاتها</p>
          </div>
          <Button onClick={() => router.push('/properties/search')}>
            <Search className="w-4 h-4 mr-2" /> بحث جديد
          </Button>
        </div>

        {searches.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Save className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-bold text-gray-700 mb-2">لا توجد بحوث محفوظة</h3>
              <p className="text-gray-500 text-sm mb-4">احفظ بحثاً للعثور على العقارات المطابقة تلقائياً</p>
              <Button onClick={() => router.push('/properties/search')}>
                ابدأ البحث
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {searches.map((search) => (
              <Card key={search.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800">{search.name}</h3>
                      <p className="text-sm text-gray-500">{formatFilters(search.filters)}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(search.createdAt).toLocaleDateString('ar')}
                        </span>
                        <span>{search.matchCount || 0} عقار مطابق</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleNotification(search.id, search.notify)}
                        className={`p-2 rounded-lg transition ${
                          search.notify
                            ? 'text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {search.notify ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => deleteSearch(search.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-[var(--color-error-soft)] rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
