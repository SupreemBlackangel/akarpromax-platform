'use client';
import { useState, useEffect } from 'react';
import { appendAdvertisingLocation, useAdvertisingLocation, type LegacyAdvertisingAd } from './useAdvertisingLocation';
import { reportAdClick, useAdImpression } from './useLegacyAdTracking';

interface AdSidebarProps {
  page: string;
  placement: 'left_01' | 'left_02' | 'right_01' | 'right_02';
  country?: string;
  governorate?: string;
  city?: string;
  language?: string;
}

export function AdSidebar({ page, placement, language = 'ar' }: AdSidebarProps) {
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

  if (loading) return <div className="w-full h-64 bg-gray-200 animate-pulse rounded" />;
  if (ads.length === 0) return <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">مساحة إعلانية</div>;

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
    <div className="w-full rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow relative">
      {creative.imageUrl ? (
        <img src={creative.imageUrl} alt={creative.imageAlt || creative.title || ''} width={180} height={225} loading="lazy" decoding="async" className="w-full h-auto object-cover" />
      ) : (
        <div className="w-full h-48 bg-gradient-to-b from-blue-500 to-purple-600 flex flex-col items-center justify-center text-white p-4">
          <h3 className="font-bold text-lg text-center">{creative.title}</h3>
          <p className="text-sm text-center opacity-90">{creative.description}</p>
          {creative.cta && <button className="mt-2 px-4 py-1 bg-white text-blue-600 rounded text-sm font-semibold">{creative.cta}</button>}
        </div>
      )}
      <button onClick={handleClick} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="اعلان" />
    </div>
  );
}
