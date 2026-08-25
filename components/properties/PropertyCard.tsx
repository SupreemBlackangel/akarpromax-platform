'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Edit, Trash2, Eye } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

interface PropertyCardProps {
  property: {
    id: string;
    titleAr: string;
    price: string;
    area: string;
    city: string;
    status: string;
    dealType: string;
    media?: Array<{ url: string; isFeatured: boolean }>;
    isFavorite?: boolean;
  };
  onUpdate?: () => void;
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  pending_review: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
  sold: 'مباع',
  rented: 'مؤجر',
  archived: 'مؤرشف',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-700',
  pending_review: 'bg-yellow-200 text-yellow-700',
  approved: 'bg-green-200 text-green-700',
  rejected: 'bg-red-200 text-red-700',
  sold: 'bg-blue-200 text-blue-700',
  rented: 'bg-purple-200 text-purple-700',
  archived: 'bg-gray-400 text-white',
};

export function PropertyCard({ property, onUpdate }: PropertyCardProps) {
  const router = useRouter();
  const { toggleFavorite, isFavorite } = useFavorites(property.id);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا العقار؟')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/properties/${property.id}`, { method: 'DELETE' });
      if (res.ok) {
        onUpdate?.();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      <div className="relative h-48 bg-gray-100">
        {property.media?.[0] ? (
          <img
            src={property.media[0].url}
            alt={property.titleAr}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            لا توجد صورة
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[property.status] || 'bg-gray-200'}`}>
            {statusLabels[property.status] || property.status}
          </span>
        </div>
        <button
          onClick={() => toggleFavorite()}
          className="absolute top-2 left-2 p-2 bg-white rounded-full shadow hover:bg-gray-100"
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </button>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg truncate">{property.titleAr}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
          <span>{property.city}</span>
          <span>•</span>
          <span>{property.area} م²</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xl font-bold text-blue-600">
            {parseFloat(property.price).toLocaleString()} ريال
          </span>
          <span className="text-sm text-gray-500">
            {property.dealType === 'sale' ? 'للبيع' : property.dealType === 'rent' ? 'للإيجار' : 'بيع/إيجار'}
          </span>
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t">
          <button
            onClick={() => router.push(`/properties/${property.id}`)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            <Eye className="w-4 h-4" /> عرض
          </button>
          <button
            onClick={() => router.push(`/dashboard/properties/${property.id}/edit`)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            <Edit className="w-4 h-4" /> تعديل
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> {isDeleting ? '...' : 'حذف'}
          </button>
        </div>
      </div>
    </div>
  );
}
