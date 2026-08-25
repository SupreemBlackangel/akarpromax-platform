'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Clock, Users, Gavel } from 'lucide-react';

interface AuctionRow {
  id: string;
  titleAr: string;
  auctionType: string | null;
  auctionStatus: string | null;
  auctionCurrentPrice: string | null;
  auctionEndDate: string | null;
  currency: string | null;
}

const statusBadge: Record<string, { label: string; color: string; bg: string }> = {
  pending_seller_terms: { label: 'بانتظار موافقة البائع', color: 'text-[var(--accent)]', bg: 'bg-amber-100' },
  active: { label: 'نشط', color: 'text-green-700', bg: 'bg-green-100' },
  awaiting_seller_decision: { label: 'بانتظار قرار البائع', color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary-soft)]' },
  awarded: { label: 'تم اعتماد الفائز', color: 'text-purple-700', bg: 'bg-purple-100' },
  ended_no_bids: { label: 'انتهى بلا مزايدات', color: 'text-gray-600', bg: 'bg-gray-100' },
  rejected: { label: 'رفض البائع النتيجة', color: 'text-[var(--color-error)]', bg: 'bg-red-100' },
  cancelled: { label: 'ملغي', color: 'text-gray-500', bg: 'bg-gray-100' },
};

export default function AuctionsDashboardPage() {
  const [rows, setRows] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auctions?mine=1&status=all&limit=100')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل في تحميل المزادات');
        setRows(data.data ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'فشل في تحميل المزادات'))
      .finally(() => setLoading(false));
  }, []);

  const active = rows.filter((r) => r.auctionStatus === 'active').length;
  const pending = rows.filter((r) => r.auctionStatus === 'pending_seller_terms').length;

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Gradient Header */}
      <div
        className="text-white px-6 pt-8 pb-12"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black mb-2">مزاداتي</h1>
            <p className="text-white/80 text-sm">إدارة المزادات التي تملكها أو أنشأتها بصفتك جهة منظمة</p>
          </div>
          <Link
            href="/dashboard/auctions/new"
            className="bg-[var(--color-surface)] text-[--brand-navy] px-6 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition flex items-center gap-2"
          >
            <Gavel className="w-4 h-4" /> مزاد جديد
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-6 pb-12 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'الكل', value: rows.length, icon: '📊', color: 'from-[--brand-navy] to-[--brand-blue]' },
            { label: 'نشط', value: active, icon: '🟢', color: 'from-green-500 to-emerald-600' },
            { label: 'بانتظار التفعيل', value: pending, icon: '⏳', color: 'from-amber-500 to-orange-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-[var(--color-surface)] rounded-2xl shadow-lg border p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${stat.color} text-white text-xl`}>
                {stat.icon}
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 font-semibold">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Auctions List */}
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-lg border overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-[var(--color-error)] font-semibold">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔨</div>
              <p className="text-gray-500 font-semibold">لا توجد مزادات بعد</p>
              <Link
                href="/dashboard/auctions/new"
                className="mt-4 inline-block px-6 py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: 'var(--brand-gradient)' }}
              >
                أطلق مزادك الأول
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {rows.map((auction) => {
                const badge = statusBadge[auction.auctionStatus || ''] || { label: auction.auctionStatus || 'غير محدد', color: 'text-gray-600', bg: 'bg-gray-100' };
                return (
                  <Link key={auction.id} href={`/auctions/${auction.id}`}>
                    <div className="p-5 hover:bg-gray-50 transition flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                          style={{ background: 'var(--brand-gradient)' }}>
                          {auction.auctionType === 'fixed' ? '🔒' : '🌐'}
                        </div>
                        <div>
                          <h2 className="font-bold text-gray-900 text-sm">{auction.titleAr}</h2>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {auction.auctionType === 'fixed' ? 'مزاد مغلق — 72 ساعة' : 'مزاد مفتوح'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <div className="text-sm font-bold text-gray-900">
                            {Number(auction.auctionCurrentPrice || 0).toLocaleString()} {auction.currency || 'SAR'}
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${badge.color} ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
