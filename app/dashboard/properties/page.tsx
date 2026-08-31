'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import OwnerPropertyCard from '@/components/properties/OwnerPropertyCard';
import { PropertyFilters } from '@/components/properties/PropertyFilters';
import DashboardPageShell from '@/src/components/dashboard/DashboardPageShell';

export default function MyPropertiesPage() {
  const [filters, setFilters] = useState({ status: 'all', page: 1 });
  const { properties, loading, error, total, pagination, refetch } = useProperties(filters);

  return (
    <DashboardPageShell
      currentPath="/dashboard/properties"
      title={{ ar: 'عقاراتي', en: 'My properties', tr: 'Mülklerim' }}
      description={{ ar: 'إدارة عقاراتك: مسودة، قيد المراجعة، منشور، مرفوض', en: 'Manage your listings: draft, in review, published, rejected', tr: 'İlanlarınızı yönetin: taslak, incelemede, yayında, reddedildi' }}
      actions={
        <Link
          href="/dashboard/properties/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          <Plus className="h-4 w-4" /> إضافة عقار
        </Link>
      }
    >
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <PropertyFilters onFilterChange={setFilters} />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-[var(--color-surface-muted)] animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-[var(--color-text-secondary)] font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 inline-block rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)]"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {properties.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🏠</div>
                <p className="text-[var(--color-text-muted)] font-semibold">لا توجد عقارات بعد</p>
                <Link
                  href="/dashboard/properties/new"
                  className="mt-4 inline-block rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)]"
                >
                  أضف عقارك الأول
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
                  {properties.map((property) => (
                    <OwnerPropertyCard key={property.id} property={property} onChanged={refetch} />
                  ))}
                </div>
                {total > 0 && pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: pagination.pages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setFilters({ ...filters, page: i + 1 })}
                        className={`w-10 h-10 rounded-xl font-bold text-sm transition ${
                          i + 1 === pagination.page
                            ? 'bg-[var(--color-primary)] text-white shadow-md'
                            : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardPageShell>
  );
}
