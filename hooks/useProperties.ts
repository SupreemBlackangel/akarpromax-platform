import { useState, useEffect, useCallback, useRef } from 'react';

type OwnerPropertyRow = {
  id: string;
  dealType?: string | null;
  titleAr?: string | null;
  titleEn?: string | null;
  city?: string | null;
  district?: string | null;
} & Record<string, unknown>;

interface PropertyFilters {
  status?: string;
  dealType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Owner-scoped listing hook. Backs "عقاراتي" (My Properties): it must return
 * ONLY the signed-in user's rows in every status — never the public feed —
 * so it talks to /api/properties/my (session-scoped server side).
 */
export function useProperties(filters: PropertyFilters = {}) {
  const [properties, setProperties] = useState<OwnerPropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const mounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);

  const fetchProperties = useCallback(async () => {
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('status', filters.status && filters.status !== 'all' ? filters.status : 'all');
      params.append('page', String(filters.page || 1));
      params.append('limit', String(filters.limit || 20));

      const res = await fetch(`/api/properties/my?${params.toString()}`, {
        cache: 'no-store',
        signal: abortController.current.signal,
      });

      if (!mounted.current) return;

      if (res.status === 401) {
        setProperties([]);
        setTotal(0);
        setError('يرجى تسجيل الدخول لعرض عقاراتك');
        return;
      }

      const data = await res.json();

      if (res.ok && data.success) {
        let rows: OwnerPropertyRow[] = data.data || [];
        // /my filters by status server-side; dealType/search narrow client-side
        // over the owner's own rows (small, already session-scoped).
        if (filters.dealType) {
          rows = rows.filter((row) => row.dealType === filters.dealType);
        }
        if (filters.search) {
          const term = filters.search.trim().toLowerCase();
          if (term) {
            rows = rows.filter((row) =>
              [row.titleAr, row.titleEn, row.city, row.district]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term)),
            );
          }
        }
        setProperties(rows);
        setTotal(data.pagination?.total || 0);
        setPagination(data.pagination || { page: 1, pages: 1 });
      } else {
        setProperties([]);
        setTotal(0);
        setError(data.error || 'فشل في جلب العقارات');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Error fetching properties:', err);
      if (mounted.current) {
        setProperties([]);
        setTotal(0);
        setError('فشل في الاتصال بالخادم');
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    mounted.current = true;
    (async () => { await fetchProperties(); })();
    return () => {
      mounted.current = false;
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [fetchProperties]);

  return { properties, loading, error, total, pagination, refetch: fetchProperties };
}
