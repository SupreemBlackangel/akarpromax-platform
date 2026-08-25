'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Gavel, Clock, ChevronRight } from 'lucide-react';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import Card from '@/src/components/ui/Card';
import { CardContent } from '@/src/components/ui/Card';

interface Auction {
  id: string;
  titleAr: string;
  descriptionAr: string;
  city: string;
  price: string;
  auctionCurrentPrice: string;
  auctionStartPrice: string;
  auctionBidCount: number;
  auctionType: string;
  auctionStatus: string;
  auctionEndDate: string;
  createdAt: string;
}

export default function AuctionsPage() {
  const router = useRouter();
  const { viewer, copy, locale, dir, country, city, openLogin, handleLogout } = useServicesPage();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auctions')
      .then(res => res.json())
      .then(data => {
        if (data.success) setAuctions(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatTimeLeft = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return 'انتهى';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)} يوم`;
    if (hours > 0) return `${hours} ساعة`;
    return `${minutes} دقيقة`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      ended: 'bg-gray-100 text-gray-700',
      draft: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'نشط',
      ended: 'منتهي',
      draft: 'مسودة',
      cancelled: 'ملغي',
    };
    return labels[status] || status;
  };

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">المزادات العقارية</h1>
            <p className="text-gray-500 text-sm">عقارات معروضة للمزاد العلني</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-xl" />)}
          </div>
        ) : auctions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Gavel className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-bold text-gray-700 mb-2">لا توجد مزادات</h3>
              <p className="text-gray-500 text-sm">لا توجد عقارات معروضة للمزاد حالياً</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {auctions.map((auction) => (
              <Card key={auction.id} interactive padding="none" onClick={() => router.push(`/auctions/${auction.id}`)}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-800 line-clamp-2">{auction.titleAr}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(auction.auctionStatus)}`}>
                        {getStatusLabel(auction.auctionStatus)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{auction.descriptionAr}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{auction.city}</span>
                      <span className="text-xs text-gray-400">{auction.auctionType === 'fixed' ? 'محدد' : 'مفتوح'}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <div>
                        <p className="text-xs text-gray-400">السعر الحالي</p>
                        <p className="font-bold text-blue-600">{parseFloat(auction.auctionCurrentPrice || '0').toLocaleString()} ريال</p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-gray-400">المزايدات</p>
                        <p className="font-bold">{auction.auctionBidCount || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTimeLeft(auction.auctionEndDate)}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PublicPageShell>
  );
}
