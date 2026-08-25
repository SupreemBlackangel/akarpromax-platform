'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, ArrowRight } from 'lucide-react';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useServicesPage } from '@/src/components/services/useServicesPage';

interface HistoryEntry {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export default function ServiceHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { viewer, copy, locale, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/service-requests/${id}/history`)
      .then(res => res.json())
      .then(data => {
        if (data.history) setHistory(data.history);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="container mx-auto p-8"><div className="h-64 bg-gray-200 animate-pulse rounded-xl" /></div>;
  }

  return (
    <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} currentPath="/services" onLogin={() => openLogin('login')} onLogout={handleLogout}>
      <div className="container mx-auto px-4 py-6 max-w-4xl" dir={dir}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-[var(--color-primary)] hover:text-blue-800"><ArrowRight className="w-5 h-5" /></button>
          <h1 className="text-2xl font-bold text-gray-800">سجل الطلب</h1>
        </div>

        {history.length === 0 ? (
          <div className="bg-[var(--color-surface)] rounded-xl shadow p-12 text-center">
            <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">لا توجد سجلات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="bg-[var(--color-surface)] rounded-xl shadow p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-full"><Clock className="w-4 h-4 text-gray-400" /></div>
                    <div>
                      <p className="font-medium text-gray-800">{entry.action}</p>
                      <p className="text-sm text-gray-500">{entry.description}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">{new Date(entry.createdAt).toLocaleString('ar')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
