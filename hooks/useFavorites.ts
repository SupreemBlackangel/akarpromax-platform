import { useState, useEffect } from 'react';

export function useFavorites(propertyId: string) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkFavorite = async () => {
    try {
      const res = await fetch(`/api/properties/favorites?propertyId=${propertyId}`);
      const data = await res.json();
      setIsFavorite(data.isFavorite || false);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async () => {
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
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => { await checkFavorite(); })();
  }, [propertyId]);

  return { isFavorite, loading, toggleFavorite };
}
