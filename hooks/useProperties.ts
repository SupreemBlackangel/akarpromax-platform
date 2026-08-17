import { useState, useEffect, useCallback, useRef } from 'react';

interface PropertyFilters {
  status?: string;
  dealType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useProperties(filters: PropertyFilters = {}) {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.dealType) params.append('dealType', filters.dealType);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', String(filters.page || 1));
      if (filters.limit) params.append('limit', String(filters.limit || 20));

      const res = await fetch(`/api/properties?${params.toString()}`, {
        signal: abortController.current.signal,
      });

      if (!mounted.current) return;

      const data = await res.json();

      if (data.success) {
        setProperties(data.data || []);
        setTotal(data.pagination?.total || 0);
        setPagination(data.pagination || { page: 1, pages: 1 });
      } else {
        setProperties([]);
        setTotal(0);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error fetching properties:', error);
      if (mounted.current) {
        setProperties([]);
        setTotal(0);
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

  return { properties, loading, total, pagination, refetch: fetchProperties };
}
