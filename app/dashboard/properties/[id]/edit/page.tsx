'use client';
import { use } from 'react';
import { useProperty } from '@/hooks/useProperty';
import { PropertyFormWithOffers } from '@/components/properties/PropertyFormWithOffers';
import DashboardPageShell from '@/src/components/dashboard/DashboardPageShell';

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { property, loading, error } = useProperty(id);

  return (
    <DashboardPageShell
      currentPath={`/dashboard/properties/${id}/edit`}
      title={{ ar: 'تعديل العقار', en: 'Edit property', tr: 'Mülkü düzenle' }}
    >
      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-[var(--color-surface-muted)]" />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-[var(--color-error)]">{error}</div>
      ) : (
        <div className="max-w-4xl">
          <PropertyFormWithOffers initialData={property ?? undefined} propertyId={id} />
        </div>
      )}
    </DashboardPageShell>
  );
}
