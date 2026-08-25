'use client';
import { useState, useEffect } from 'react';
import { appendAdvertisingLocation, useAdvertisingLocation, type LegacyAdvertisingAd } from './useAdvertisingLocation';

interface AdHeroProps {
  page: string;
  country?: string;
  governorate?: string;
  city?: string;
  language?: string;
}

export function AdHero({ page, language = 'ar' }: AdHeroProps) {
  const location = useAdvertisingLocation();
  const [ads, setAds] = useState<LegacyAdvertisingAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ page, placement: 'hero', language });
    appendAdvertisingLocation(params, location);
    fetch(`/api/advertising/match?${params.toString()}`)
      .then(res => res.json())
      .then((data: { success?: boolean; data?: { ads?: LegacyAdvertisingAd[] } }) => { if (data.success) { setAds(data.data?.ads || []); } setLoading(false); })
      .catch(() => setLoading(false));
  }, [language, location, page]);

  useEffect(() => {
    if (ads.length > 1) {
      const timer = setInterval(() => setCurrentIndex((prev) => (prev + 1) % ads.length), 5000);
      return () => clearInterval(timer);
    }
  }, [ads]);

  if (loading) return <div className="w-full h-64 bg-gray-200 animate-pulse rounded" />;
  if (ads.length === 0) return <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center text-gray-400">لا توجد إعلانات</div>;

  const ad = ads[currentIndex];
  const creative = ad.creatives?.find((candidate) => candidate.language === language) || ad.creatives?.[0];
  if (!creative) return null;

  const handleClick = () => {
    fetch('/api/advertising/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: ad.campaign.id, creativeId: creative.id, eventType: 'click', page, placement: 'hero', ...location }) });
    if (creative.url) window.open(creative.url, '_blank');
  };

  return (
    <div className="relative w-full overflow-visible rounded-lg">
      <div className="relative w-full aspect-[21/9] min-h-[300px] max-h-[440px]">
        {creative.imageUrl ? (
          <img src={creative.imageUrl} alt={creative.imageAlt || creative.title || ''} width={1200} height={400} loading="eager" fetchPriority="high" decoding="async" className="w-full h-full object-contain rounded-lg" />
        ) : creative.videoUrl ? (
          <video src={creative.videoUrl} className="w-full h-full object-contain rounded-lg" autoPlay muted loop />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex flex-col items-center justify-center text-white p-8">
            <h2 className="text-3xl font-bold mb-2">{creative.title}</h2>
            <p className="text-lg mb-4">{creative.description}</p>
            {creative.cta && <button className="px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold">{creative.cta}</button>}
          </div>
        )}
        <button onClick={handleClick} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="اعلان" />
      </div>
      {ads.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {ads.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full ${i === currentIndex ? 'bg-white' : 'bg-white/50'}`} />)}
        </div>
      )}
    </div>
  );
}
