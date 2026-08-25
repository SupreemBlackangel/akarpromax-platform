'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Gavel, Clock, TrendingUp, Trophy } from 'lucide-react';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import Button from '@/src/components/ui/Button';
import Card from '@/src/components/ui/Card';
import { CardContent } from '@/src/components/ui/Card';

interface Bid {
  id: string;
  bidderId: string;
  amount: string;
  createdAt: string;
}

interface AuctionDetail {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  city: string;
  governorate: string;
  price: string;
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
  bids: Bid[];
}

function AuctionDetailInner() {
  const params = useParams();
  const id = params?.id as string;
  const { viewer, copy, locale, dir, country, city, openLogin, handleLogout } = useServicesPage();
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');

  const fetchAuction = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/auctions/${id}`);
      const data = await res.json();
      if (data.success) {
        setAuction(data.data);
      } else {
        setError(data.error || 'فشل في جلب المزاد');
      }
    } catch {
      setError('فشل في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAuction(); }, [fetchAuction]);

  const placeBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidError('');
    setBidSuccess('');
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setBidError('أدخل مبلغ صحيح');
      return;
    }
    setBidding(true);
    try {
      const res = await fetch(`/api/auctions/${id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBidError(data.error || 'فشل في إرسال المزايدة');
        return;
      }
      setBidSuccess('تم إرسال مزايدتك بنجاح');
      setAmount('');
      fetchAuction();
    } catch {
      setBidError('فشل في الاتصال بالخادم');
    } finally {
      setBidding(false);
    }
  };

  const formatTimeLeft = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return 'انتهى';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
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
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
      currentPath="/auctions"
    >
      <div className="container mx-auto px-4 py-6" dir={dir}>
        {loading ? (
          <div className="h-96 bg-gray-200 animate-pulse rounded-xl" />
        ) : error || !auction ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">{error || 'العقار غير موجود'}</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">{auction.titleAr}</h1>
                    <span className={`px-3 py-1 rounded text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {isActive ? 'نشط' : 'منتهي'}
                    </span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{auction.descriptionAr}</p>
                  <div className="mt-4 text-sm text-gray-500">
                    {auction.governorate} - {auction.city}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" /> سجل المزايدات
                  </h2>
                  {auction.bids.length === 0 ? (
                    <p className="text-gray-500 text-sm">لا توجد مزايدات بعد</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {auction.bids.map((bid, index) => (
                        <div key={bid.id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-800">
                              {index === 0 ? <Trophy className="w-4 h-4 inline text-yellow-500 ml-1" /> : null}
                              مزايد #{auction.bids.length - index}
                            </span>
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-blue-600">{parseFloat(bid.amount).toLocaleString()} {auction.currency}</span>
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
                      <span className="text-xl font-bold text-blue-600">
                        {parseFloat(auction.auctionCurrentPrice || auction.auctionStartPrice || '0').toLocaleString()} {auction.currency}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">سعر البداية</span>
                      <span>{parseFloat(auction.auctionStartPrice || '0').toLocaleString()} {auction.currency}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">عدد المزايدات</span>
                      <span>{auction.auctionBidCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">نوع المزاد</span>
                      <span>{auction.auctionType === 'fixed' ? 'محدد' : 'مفتوح'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1"><Clock className="w-4 h-4" /> الوقت المتبقي</span>
                      <span className={isActive ? 'text-green-600 font-bold' : 'text-gray-400'}>{formatTimeLeft(auction.auctionEndDate)}</span>
                    </div>
                    {auction.auctionBidIncrement && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">الحد الأدنى للزيادة</span>
                        <span>{parseFloat(auction.auctionBidIncrement).toLocaleString()} {auction.currency}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Gavel className="w-5 h-5" /> ساهم بالمزايدة
                  </h2>
                  {isActive ? (
                    <form onSubmit={placeBid} className="space-y-3">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`أدخل مبلغ أعلى من ${parseFloat(auction.auctionCurrentPrice || auction.auctionStartPrice || '0').toLocaleString()}`}
                        className="w-full p-3 border rounded-lg"
                        min={parseFloat(auction.auctionCurrentPrice || auction.auctionStartPrice || '0') + (parseFloat(auction.auctionBidIncrement) || 1)}
                        step={parseFloat(auction.auctionBidIncrement) || 1}
                        required
                      />
                      {bidError && <p className="text-red-600 text-sm">{bidError}</p>}
                      {bidSuccess && <p className="text-green-600 text-sm">{bidSuccess}</p>}
                      <Button type="submit" loading={bidding} className="w-full">
                        <Gavel className="w-4 h-4" /> إرسال المزايدة
                      </Button>
                    </form>
                  ) : auction.auctionWinnerId ? (
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <Trophy className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                      <p className="font-bold text-green-700">تم إنهاء المزاد</p>
                      <p className="text-sm text-gray-600 mt-1">
                        السعر الفائز: {parseFloat(auction.auctionWinningPrice || '0').toLocaleString()} {auction.currency}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">انتهى هذا المزاد بدون مزايدات</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PublicPageShell>
  );
}

export default function AuctionDetailPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-8"><div className="h-96 bg-gray-200 animate-pulse rounded-xl" /></div>}>
      <AuctionDetailInner />
    </Suspense>
  );
}
