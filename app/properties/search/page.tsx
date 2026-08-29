'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, SlidersHorizontal, MapPin, Home } from 'lucide-react';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import LuxuryPropertyCard, { type CardProperty } from '@/src/components/ui/LuxuryPropertyCard';

interface OfferType {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [offerTypeId, setOfferTypeId] = useState(searchParams.get('offerTypeId') || '');
  const [marketingMethod, setMarketingMethod] = useState(searchParams.get('marketingMethod') || 'all');
  const [auctionType, setAuctionType] = useState(searchParams.get('auctionType') || 'all');
  const [cityFilter, setCityFilter] = useState(searchParams.get('city') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [results, setResults] = useState<CardProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [offerTypes, setOfferTypes] = useState<OfferType[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch('/api/offer-types').then(r => r.json()).then(d => {
      if (d.success) setOfferTypes(d.data);
    }).catch(() => {});
  }, []);

  const performSearch = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (offerTypeId) params.append('offerTypeId', offerTypeId);
      if (marketingMethod !== 'all') params.append('marketingMethod', marketingMethod);
      if (auctionType !== 'all') params.append('auctionType', auctionType);
      // Platform location scopes the search by default; the manual city
      // input in the filters panel overrides the detected city.
      if (country) params.append('country', country);
      if (cityFilter) params.append('city', cityFilter);
      else if (city) params.append('city', city);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      params.append('page', String(page));
      params.append('limit', '20');
      const res = await fetch(`/api/properties/search?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        setPagination(data.pagination);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [query, offerTypeId, marketingMethod, auctionType, cityFilter, minPrice, maxPrice, country, city]);

  // Initial load, re-run when the platform location resolves or changes —
  // other filters only apply on the explicit search action, as before.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void performSearch(1); }, [country, city]);

  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (offerTypeId) params.append('offerTypeId', offerTypeId);
    if (marketingMethod !== 'all') params.append('marketingMethod', marketingMethod);
    if (auctionType !== 'all') params.append('auctionType', auctionType);
    if (cityFilter) params.append('city', cityFilter);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    router.push(`/properties/search?${params.toString()}`, { scroll: false });
  }, [query, offerTypeId, marketingMethod, auctionType, cityFilter, minPrice, maxPrice, router]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    updateUrl();
    performSearch(1);
  }, [updateUrl, performSearch]);

  const handleFilterChange = useCallback(() => {
    updateUrl();
    performSearch(1);
  }, [updateUrl, performSearch]);

  const clearFilters = useCallback(() => {
    setQuery('');
    setOfferTypeId('');
    setMarketingMethod('all');
    setAuctionType('all');
    setCityFilter('');
    setMinPrice('');
    setMaxPrice('');
    setShowFilters(false);
    router.push('/properties/search', { scroll: false });
    setTimeout(() => performSearch(1), 100);
  }, [router, performSearch]);

  const getOfferTypeName = (id: string) => {
    const found = offerTypes.find(t => t.id === id);
    return found ? found.nameAr : id;
  };

  return (
    <>
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
      currentPath="/properties"
    >
      <div className="container mx-auto px-4 py-6" dir={dir}>
        <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن عقار..."
                  className="w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                <select
                  value={offerTypeId}
                  onChange={(e) => setOfferTypeId(e.target.value)}
                  className="p-2 border rounded-lg"
                >
                  <option value="">نوع العرض</option>
                  {offerTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.nameAr}</option>
                  ))}
                </select>
                <select
                  value={marketingMethod}
                  onChange={(e) => setMarketingMethod(e.target.value)}
                  className="p-2 border rounded-lg"
                >
                  <option value="all">طريقة العرض</option>
                  <option value="direct">مباشر</option>
                  <option value="auction">مزاد</option>
                </select>
                <select
                  value={auctionType}
                  onChange={(e) => setAuctionType(e.target.value)}
                  disabled={marketingMethod !== 'auction'}
                  className="p-2 border rounded-lg"
                >
                  <option value="all">نوع المزاد</option>
                  <option value="fixed">محدد</option>
                  <option value="open">مفتوح</option>
                </select>
                <button type="submit" className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold hover:bg-[var(--color-primary-hover)]">
                  <Search className="w-4 h-4 inline mr-1" /> بحث
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[var(--color-primary)]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? 'إخفاء الفلاتر' : 'فلاتر متقدمة'}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-gray-400 hover:text-red-600"
          >
            مسح الكل
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
            <input
              type="text"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="المدينة"
              className="p-2 border rounded-lg"
            />
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="السعر من"
              className="p-2 border rounded-lg"
            />
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="السعر إلى"
              className="p-2 border rounded-lg"
            />
            <button type="button" onClick={handleFilterChange} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold">
              تطبيق الفلاتر
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{pagination.total} نتيجة</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-xl" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border p-12 text-center">
          <Home className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">لا توجد نتائج</h3>
          <p className="text-gray-500 text-sm">حاول تعديل معايير البحث</p>
          <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold">مسح الفلاتر</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((property) => (
              <LuxuryPropertyCard key={property.id} property={property} />
            ))}
          </div>
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: pagination.pages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => performSearch(i + 1)}
                  className={`px-3 py-1 rounded ${i + 1 === pagination.page ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </PublicPageShell>
    {AccountDialog}
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-8"><div className="h-64 bg-gray-200 animate-pulse rounded-xl"></div></div>}>
      <SearchPageInner />
    </Suspense>
  );
}