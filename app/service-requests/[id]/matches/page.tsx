'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, User, MapPin, Star, MessageCircle } from 'lucide-react';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useServicesPage } from '@/src/components/services/useServicesPage';

interface Match {
  id: string;
  providerId: string;
  providerName: string;
  providerCity: string;
  providerRating: string;
  score: number;
  status: string;
  message: string;
  createdAt: string;
}

export default function ServiceMatchesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { viewer, copy, locale, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/service-requests/${id}`).then(r => r.json()),
      fetch(`/api/service-requests/${id}/matching`).then(r => r.json()),
    ]).then(([reqRes, matchRes]) => {
      if (reqRes.success) setRequest(reqRes.data);
      if (matchRes.matches) setMatches(matchRes.matches);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const acceptMatch = async (matchId: string) => {
    const res = await fetch(`/api/service-requests/${id}/matches/${matchId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    });
    if (res.ok) setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'accepted' } : m));
  };

  const rejectMatch = async (matchId: string) => {
    const res = await fetch(`/api/service-requests/${id}/matches/${matchId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    });
    if (res.ok) setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'rejected' } : m));
  };

  if (loading) {
    return <div className="container mx-auto p-8"><div className="h-64 bg-gray-200 animate-pulse rounded-xl" /></div>;
  }

  return (
    <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} currentPath="/services" onLogin={() => openLogin('login')} onLogout={handleLogout}>
      <div className="container mx-auto px-4 py-6 max-w-4xl" dir={dir}>
        <button onClick={() => router.back()} className="text-[var(--color-primary)] hover:text-blue-800 mb-4">← العودة</button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">المحترفون المطابقون</h1>

        {request && (
          <div className="bg-[var(--color-surface)] rounded-xl shadow p-4 mb-6">
            <h3 className="font-semibold text-gray-800">{String(request.title ?? '')}</h3>
            <p className="text-sm text-gray-500">{String(request.description ?? '')}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {String(request.city ?? '')}</span>
              {typeof request.budget === 'number' || typeof request.budget === 'string' ? (
                <span>{Number(request.budget).toLocaleString()} ريال</span>
              ) : null}
            </div>
          </div>
        )}

        {matches.length === 0 ? (
          <div className="bg-[var(--color-surface)] rounded-xl shadow p-12 text-center">
            <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-gray-700 mb-2">لا توجد مطابقات</h3>
            <p className="text-gray-500 text-sm">لم نجد محترفين مطابقين لطلبك حالياً</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div key={match.id} className="bg-[var(--color-surface)] rounded-xl shadow p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                    {match.providerName?.[0] || 'م'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800">{match.providerName}</h3>
                      <span className="text-sm text-gray-400">{new Date(match.createdAt).toLocaleDateString('ar')}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {match.providerCity}</span>
                      {match.providerRating && (
                        <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{Number(match.providerRating).toFixed(1)}</span>
                      )}
                      <span className="text-xs text-gray-400">مطابقة: {match.score}%</span>
                    </div>
                    {match.message && <p className="text-sm text-gray-600 mt-2">{match.message}</p>}
                    <div className="flex gap-3 mt-4">
                      {match.status === 'pending' ? (
                        <>
                          <button onClick={() => acceptMatch(match.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">
                            <CheckCircle className="w-4 h-4" /> قبول
                          </button>
                          <button onClick={() => rejectMatch(match.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-[var(--color-error)] rounded-lg text-sm font-bold hover:bg-red-200">
                            <XCircle className="w-4 h-4" /> رفض
                          </button>
                          <button onClick={() => router.push(`/messages/${match.providerId}`)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200">
                            <MessageCircle className="w-4 h-4" /> مراسلة
                          </button>
                        </>
                      ) : match.status === 'accepted' ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">تم القبول</span>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-[var(--color-error)] rounded text-sm">تم الرفض</span>
                      )}
                    </div>
                  </div>
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
