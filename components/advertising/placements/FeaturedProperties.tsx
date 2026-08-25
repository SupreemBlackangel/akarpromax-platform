'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  appendAdvertisingLocation,
  useAdvertisingLocation,
  type LegacyFeaturedProperty,
  type LegacyFeaturedReference,
} from './useAdvertisingLocation';

interface FeaturedPropertiesProps {
  page: string;
  country?: string;
  governorate?: string;
  city?: string;
  limit?: number;
}

export function FeaturedProperties({ page, limit = 6 }: FeaturedPropertiesProps) {
  const router = useRouter();
  const location = useAdvertisingLocation();
  const [properties, setProperties] = useState<LegacyFeaturedProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ page });
    appendAdvertisingLocation(params, location);
    fetch(`/api/advertising/match?${params.toString()}`)
      .then(res => res.json())
      .then((data: { success?: boolean; data?: { featured?: LegacyFeaturedReference[] } }) => {
        if (data.success) {
          const featured = data.data?.featured || [];
          const propertyIds = featured.map((item) => item.propertyId).join(',');
          if (propertyIds) {
            const propertyParams = new URLSearchParams({ ids: propertyIds, limit: String(limit), scope: location.isGlobal ? 'global' : 'local' });
            appendAdvertisingLocation(propertyParams, location);
            fetch(`/api/properties?${propertyParams.toString()}`)
              .then(r => r.json())
              .then((propertyData: { success?: boolean; data?: LegacyFeaturedProperty[] }) => { if (propertyData.success) setProperties(propertyData.data ?? []); setLoading(false); })
              .catch(() => setLoading(false));
          } else { setProperties([]); setLoading(false); }
        } else { setLoading(false); }
      })
      .catch(() => setLoading(false));
  }, [limit, location, page]);

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><div className="h-48 bg-gray-200 animate-pulse rounded" /></div>;
  if (properties.length === 0) return null;

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-6">عقارات مميزة</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((property) => (
          <div key={property.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/properties/${property.id}`)}>
            <div className="h-40 bg-gray-200 rounded-t-lg overflow-hidden">
              {property.media?.[0] ? <img src={property.media[0].url} alt={property.titleAr ?? ''} width={400} height={160} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-gray-400">لا توجد صورة</div>}
            </div>
            <div className="p-4">
              <h3 className="font-semibold truncate">{property.titleAr}</h3>
              <p className="text-sm text-gray-500">{property.city} - {property.area} م2</p>
              <p className="text-lg font-bold text-blue-600">{Number(property.price ?? 0).toLocaleString()} ريال</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
