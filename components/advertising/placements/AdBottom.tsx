'use client';
import { useState, useEffect } from 'react';
import { appendAdvertisingLocation, useAdvertisingLocation, type LegacyAdvertisingAd } from './useAdvertisingLocation';
import { reportAdClick, useAdImpression } from './useLegacyAdTracking';

interface AdBottomProps {
  page: string;
  placement: 'bottom_01' | 'bottom_02' | 'bottom_03';
  country?: string;
  governorate?: string;
  city?: string;
  language?: string;
}

export function AdBottom({ page, placement, language = 'ar' }: AdBottomProps) {
  const location = useAdvertisingLocation();
  const [ads, setAds] = useState<LegacyAdvertisingAd[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ page, placement, language });
    appendAdvertisingLocation(params, location);
    fetch(`/api/advertising/match?${params.toString()}`)
      .then(res => res.json())
      .then((data: { success?: boolean; data?: { ads?: LegacyAdvertisingAd[] } }) => { if (data.success) { setAds(data.data?.ads || []); } setLoading(false); })
      .catch(() => setLoading(false));
  }, [language, location, page, placement]);

  // Resolved before the early returns: a hook may not sit behind a conditional
  // return, and the impression must be reported for the ad that renders.
  const ad = ads.length > 0 ? ads[0] : undefined;
  const creative = ad?.creatives?.find((candidate) => candidate.language === language) || ad?.creatives?.[0];

  useAdImpression(ad?.campaign?.id, creative?.trackingToken ?? undefined, {
    countryCode: location.country || undefined,
    language,
  });

  if (loading) return <div className="w-full h-24 bg-gray-200 animate-pulse rounded" />;
  if (ads.length === 0) return <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">مساحة إعلانية</div>;

  if (!creative) return null;

  const handleClick = () => {
    // Through the engine, so the click reaches the counters every report reads.
    reportAdClick(ad?.campaign?.id, creative?.trackingToken ?? undefined, {
      countryCode: location.country || undefined,
      language,
    });
    // The legacy write is left in place: it lands in a table nothing currently
    // reads, but removing a write is a separate decision from starting the ones
    // that were missing.
    fetch('/api/advertising/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: ad?.campaign?.id, creativeId: creative.id, eventType: 'click', page, placement, ...location }) });
    if (creative.url) window.open(creative.url, '_blank');
  };

  return (
    <div className="w-full rounded-lg overflow-hidden shadow-sm hover:shadow transition-shadow relative">
      {creative.imageUrl ? (
        <img src={creative.imageUrl} alt={creative.imageAlt || creative.title || ''} width={600} height={96} loading="lazy" decoding="async" className="w-full h-24 object-cover" />
      ) : (
        <div className="w-full h-24 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-between text-white px-6">
          <span className="font-bold">{creative.title}</span>
          <span className="text-sm opacity-90">{creative.description}</span>
          {creative.cta && <span className="px-4 py-1 bg-white text-blue-600 rounded text-sm font-semibold">{creative.cta}</span>}
        </div>
      )}
      <button onClick={handleClick} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="اعلان" />
    </div>
  );
}
