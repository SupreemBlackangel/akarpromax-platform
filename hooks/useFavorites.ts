import { useState, useRef, useCallback } from 'react';

export function useFavorites(propertyId: string) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const checked = useRef(false);

  const checkFavorite = useCallback(async () => {
    if (checked.current) return;
    checked.current = true;
    try {
      const res = await fetch(`/api/properties/favorites?propertyId=${propertyId}`);
      const data = await res.json();
      setIsFavorite(data.isFavorite || false);
    } catch {
      // Silently ignore — guest users or network errors.
    }
  }, [propertyId]);

  const toggleFavorite = async () => {
    if (!checked.current) await checkFavorite();
    setLoading(true);
    try {
      const method = isFavorite ? 'DELETE' : 'POST';
      const res = await fetch(`/api/properties/favorites`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      if (res.ok) {
        setIsFavorite(!isFavorite);
      }
    } catch {
      // Silently ignore.
    } finally {
      setLoading(false);
    }
  };

  return { isFavorite, loading, toggleFavorite };
}
