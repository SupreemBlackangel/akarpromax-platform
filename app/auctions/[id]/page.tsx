'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Clock, FileText, Gavel, ShieldCheck, TrendingUp, Trophy } from 'lucide-react';

import PublicPageShell from '@/src/components/PublicPageShell';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import Button from '@/src/components/ui/Button';
import Card, { CardContent } from '@/src/components/ui/Card';

interface Bid {
  id: string;
  amount: string;
  createdAt: string;
}

interface AuctionDetail {
  id: string;
  titleAr: string;
  titleEn?: string | null;
  descriptionAr: string;
  descriptionEn?: string | null;
  city: string;
  governorate: string;
  currency: string;
  auctionType: string;
  auctionStatus: string;
  auctionStartPrice: string;
  auctionCurrentPrice: string;
  auctionBidIncrement: string;
  auctionEndDate: string;
  auctionBidCount: number;
  auctionWinnerId: string | null;
  auctionWinningPrice: string | null;
  auctionContractUrl?: string | null;
  bids: Bid[];
  bidderTerms?: {
    version: string;
    contentAr: string;
    contentHash: string;
  } | null;
  contract?: {
    contractNumber: string;
    contentHash: string;
    status: string;
    url: string | null;
  } | null;
  viewerActions?: {
    canAcceptSellerTerms: boolean;
    canDecideOpenAuction: boolean;
    canFinalizeExpiredAuction: boolean;
  };
}

const statusLabels: Record<string, string> = {
  pending_seller_terms: 'بانتظار موافقة البائع',
  active: 'نشط',
  awaiting_seller_decision: 'بانتظار قرار البائع',
  awarded: 'تم اعتماد الفائز',
  ended_no_bids: 'انتهى بلا مزايدات',
  rejected: 'رفض البائع النتيجة',
  cancelled: 'ملغي',
};

function AuctionDetailInner() {
  const params = useParams();
  const id = params?.id as string;
  const { viewer, copy, locale, dir, country, city, openLogin, handleLogout } = useServicesPage();

  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const fetchAuction = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/auctions/${id}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'فشل في جلب المزاد');
        setAuction(null);
      } else {
        setAuction(data.data);
      }
    } catch {
      setError('فشل في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { (async () => { await fetchAuction(); })(); }, [fetchAuction]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const runAction = async (url: string, body?: Record<string, unknown>) => {
    setBusy(true);
    setActionError('');
    setActionSuccess('');
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const data = await response.json();
      if (!response.ok) {
        setActionError(data.error || 'تعذر تنفيذ العملية');
        return false;
      }
      await fetchAuction();
      return true;
    } catch {
      setActionError('فشل في الاتصال بالخادم');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const placeBid = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setActionError('أدخل مبلغاً صحيحاً');
      return;
    }
    if (!termsAccepted) {
      setActionError('يجب الموافقة على شروط المزايدة');
      return;
    }

    setBusy(true);
    setActionError('');
    setActionSuccess('');
    try {
      const idempotencyKey = crypto.randomUUID();
      const response = await fetch(`/api/auctions/${id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ amount: value, termsAccepted: true, idempotencyKey }),
      });
      const data = await response.json();
      if (!response.ok) {
        setActionError(data.error || 'فشل في إرسال المزايدة');
        return;
      }
      setAmount('');
      setActionSuccess(data.data?.idempotent ? 'هذه المزايدة مسجلة مسبقاً' : 'تم تسجيل المزايدة بنجاح');
      await fetchAuction();
    } catch {
      setActionError('فشل في الاتصال بالخادم');
    } finally {
      setBusy(false);
    }
  };

  const formatTimeLeft = (endDate: string) => {
    const diff = new Date(endDate).getTime() - now;
    if (diff <= 0) return 'انتهى';
    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    if (hours > 24) return `${Math.floor(hours / 24)} يوم`;
    if (hours > 0) return `${hours} ساعة`;
    return `${minutes} دقيقة`;
  };

  const isActive = auction?.auctionStatus === 'active';

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      onLogin={() => openLogin('login')}
      onLogout={handleLogout}
      currentPath="/auctions"
    >
      <div className="container mx-auto px-4 py-6" dir={dir}>
        {loading ? (
          <div className="h-96 animate-pulse rounded-xl bg-gray-200" />
        ) : error || !auction ? (
          <Card><CardContent className="p-12 text-center text-gray-500">{error || 'المزاد غير موجود'}</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-black text-gray-900">{auction.titleAr}</h1>
                      <p className="mt-1 text-sm text-gray-500">{auction.auctionType === 'fixed' ? 'مزاد مغلق' : 'مزاد مفتوح'}</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                      {statusLabels[auction.auctionStatus] || auction.auctionStatus}
                    </span>
                  </div>
                  <p className="leading-7 text-gray-600">{auction.descriptionAr}</p>
                  <p className="mt-4 text-sm text-gray-500">{auction.governorate} - {auction.city}</p>
                </CardContent>
              </Card>

              {auction.viewerActions?.canAcceptSellerTerms && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-1 h-5 w-5 text-[var(--color-primary)]" />
                      <div className="flex-1">
                        <h2 className="font-black text-gray-900">اعتماد البائع</h2>
                        <p className="mt-1 text-sm text-gray-600">الجهة المنظمة أنشأت المزاد، ولن يبدأ قبل موافقتك كمالك للعقار على شروط المزاد.</p>
                        <Button
                          className="mt-4"
                          loading={busy}
                          onClick={async () => {
                            if (await runAction(`/api/auctions/${id}/terms`, { accept: true })) setActionSuccess('تم اعتماد شروط البائع وتفعيل المزاد');
                          }}
                        >
                          أوافق وأفعّل المزاد
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {auction.viewerActions?.canDecideOpenAuction && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="font-black text-gray-900">قرار البائع في المزاد المفتوح</h2>
                    <p className="mt-2 text-sm text-gray-600">انتهى الوقت. قبول النتيجة ينشئ Award ثابتاً وعقداً بينك وبين صاحب أعلى مزايدة. الرفض لا يولد عقداً.</p>
                    <div className="mt-4 flex gap-3">
                      <Button loading={busy} onClick={async () => {
                        if (await runAction(`/api/auctions/${id}/decision`, { action: 'accept' })) setActionSuccess('تم اعتماد الفائز وتوليد العقد');
                      }}>قبول النتيجة</Button>
                      <Button variant="secondary" loading={busy} onClick={async () => {
                        if (await runAction(`/api/auctions/${id}/decision`, { action: 'reject' })) setActionSuccess('تم رفض نتيجة المزاد');
                      }}>رفض النتيجة</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {auction.viewerActions?.canFinalizeExpiredAuction && (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600">انتهى الوقت المعتمد من الخادم وتحتاج النتيجة إلى الإقفال.</p>
                    <Button className="mt-3" loading={busy} onClick={async () => {
                      if (await runAction(`/api/auctions/${id}/end`)) setActionSuccess('تم إقفال المزاد وفق وقت الخادم');
                    }}>إقفال نتيجة المزاد</Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 font-black text-gray-900">
                    <TrendingUp className="h-5 w-5" /> سجل المزايدات
                  </h2>
                  {auction.bids.length === 0 ? (
                    <p className="text-sm text-gray-500">لا توجد مزايدات بعد</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {auction.bids.map((bid, index) => (
                        <div key={bid.id} className="flex items-center justify-between py-3">
                          <span className="text-sm font-bold text-gray-800">
                            {index === 0 ? <Trophy className="ml-1 inline h-4 w-4 text-yellow-500" /> : null}
                            مزايدة #{auction.bids.length - index}
                          </span>
                          <div className="text-left">
                            <strong className="text-[var(--color-primary)]">{Number(bid.amount).toLocaleString()} {auction.currency}</strong>
                            <span className="block text-xs text-gray-400">{new Date(bid.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">السعر الحالي</span>
                      <span className="text-xl font-black text-[var(--color-primary)]">{Number(auction.auctionCurrentPrice || auction.auctionStartPrice || 0).toLocaleString()} {auction.currency}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500">سعر البداية</span><span>{Number(auction.auctionStartPrice || 0).toLocaleString()} {auction.currency}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500">عدد المزايدات</span><span>{auction.auctionBidCount || 0}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500">نوع المزاد</span><span>{auction.auctionType === 'fixed' ? 'مغلق' : 'مفتوح'}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-1 text-gray-500"><Clock className="h-4 w-4" /> الوقت</span><span className={isActive ? 'font-bold text-green-600' : 'text-gray-500'}>{formatTimeLeft(auction.auctionEndDate)}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500">الزيادة الدنيا</span><span>{Number(auction.auctionBidIncrement || 0).toLocaleString()} {auction.currency}</span></div>
                  </div>
                </CardContent>
              </Card>

              {isActive && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="mb-4 flex items-center gap-2 font-black text-gray-900"><Gavel className="h-5 w-5" /> المزايدة</h2>
                    <form onSubmit={placeBid} className="space-y-3">
                      <input
                        type="number"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        min={Number(auction.auctionCurrentPrice || auction.auctionStartPrice || 0) + Number(auction.auctionBidIncrement || 1)}
                        step="0.01"
                        className="w-full rounded-lg border p-3"
                        placeholder="مبلغ المزايدة"
                        required
                      />
                      {auction.bidderTerms && (
                        <div className="rounded-xl border bg-gray-50 p-3">
                          <p className="max-h-28 overflow-auto text-xs leading-6 text-gray-600">{auction.bidderTerms.contentAr}</p>
                          <label className="mt-3 flex items-start gap-2 text-sm font-medium">
                            <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1" />
                            <span>أوافق على شروط المزايدة — الإصدار {auction.bidderTerms.version}</span>
                          </label>
                        </div>
                      )}
                      <Button type="submit" loading={busy} className="w-full">إرسال المزايدة</Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {auction.contract && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="flex items-center gap-2 font-black text-gray-900"><FileText className="h-5 w-5" /> العقد الناتج</h2>
                    <p className="mt-2 text-sm text-gray-600">رقم العقد: {auction.contract.contractNumber}</p>
                    <p className="mt-1 break-all text-xs text-gray-400">SHA-256: {auction.contract.contentHash}</p>
                    <a href={`/api/auctions/${id}/contract?download=1`} className="mt-4 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white">تنزيل سجل العقد</a>
                  </CardContent>
                </Card>
              )}

              {actionError && <div className="rounded-xl bg-[var(--color-error-soft)] p-3 text-sm text-[var(--color-error)]">{actionError}</div>}
              {actionSuccess && <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{actionSuccess}</div>}
            </div>
          </div>
        )}
      </div>
    </PublicPageShell>
  );
}

export default function AuctionDetailPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-8"><div className="h-96 animate-pulse rounded-xl bg-gray-200" /></div>}>
      <AuctionDetailInner />
    </Suspense>
  );
}
