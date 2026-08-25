import { useState, useEffect, useCallback } from 'react';
import type { PropertyFormData } from '@/components/properties/PropertyFormWithOffers';

export function useProperty(id: string | null) {
  const [property, setProperty] = useState<PropertyFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperty = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${id}`);
      const data = await res.json();
      if (data.success) {
        setProperty(data.data);
      } else {
        setError(data.error || 'العقار غير موجود');
      }
    } catch {
      setError('فشل في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { (async () => { await fetchProperty(); })(); }, [fetchProperty]);

  return { property, loading, error, refetch: fetchProperty };
}
