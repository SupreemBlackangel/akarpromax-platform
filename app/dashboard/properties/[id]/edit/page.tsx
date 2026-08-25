'use client';
import { use } from 'react';
import { useProperty } from '@/hooks/useProperty';
import { PropertyFormWithOffers } from '@/components/properties/PropertyFormWithOffers';

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { property, loading, error } = useProperty(id);

  if (loading) return <div className="container mx-auto p-4"><div className="h-64 bg-gray-200 animate-pulse rounded" /></div>;
  if (error) return <div className="container mx-auto p-4"><div className="p-4 bg-red-100 text-[var(--color-error)] rounded">{error}</div></div>;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">تعديل العقار</h1>
      <PropertyFormWithOffers initialData={property ?? undefined} propertyId={id} />
    </div>
  );
}
