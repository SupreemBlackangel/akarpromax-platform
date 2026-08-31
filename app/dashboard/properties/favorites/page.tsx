'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Trash2, Eye } from 'lucide-react';
import DashboardPageShell from '@/src/components/dashboard/DashboardPageShell';
import type { propertyFavorites } from '@/lib/db/schemas/properties-schema';

type FavoriteRow = typeof propertyFavorites.$inferSelect & {
  property?: { titleAr?: string | null } | null;
};

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/properties/favorites');
      const data = await res.json();
      if (data.success) setFavorites(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { (async () => { await fetchFavorites(); })(); }, []);

  const removeFavorite = async (propertyId: string) => {
    await fetch('/api/properties/favorites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId }),
    });
    setFavorites(prev => prev.filter((f) => f.propertyId !== propertyId));
  };

  return (
    <DashboardPageShell
      currentPath="/dashboard/properties/favorites"
      title={{ ar: 'المفضلة', en: 'Favorites', tr: 'Favoriler' }}
      description={{ ar: 'العقارات التي حفظتها للرجوع إليها', en: 'Listings you saved for later', tr: 'Sonrası için kaydettiğiniz ilanlar' }}
    >
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-200 animate-pulse rounded" />)}
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>لا توجد عقارات في المفضلة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => (
            <div key={fav.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4">
              <h3 className="font-semibold">{fav.property?.titleAr || fav.propertyId}</h3>
              <div className="flex gap-2 mt-4">
                <button onClick={() => router.push(`/properties/${fav.propertyId}`)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200">
                  <Eye className="w-4 h-4" /> عرض
                </button>
                <button onClick={() => fav.propertyId && removeFavorite(fav.propertyId)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-100 text-[var(--color-error)] rounded hover:bg-red-200">
                  <Trash2 className="w-4 h-4" /> إزالة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardPageShell>
  );
}
