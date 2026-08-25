'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useProperties } from '@/hooks/useProperties';
import OwnerPropertyCard from '@/components/properties/OwnerPropertyCard';
import { PropertyFilters } from '@/components/properties/PropertyFilters';

export default function MyPropertiesPage() {
  const [filters, setFilters] = useState({ status: 'all', page: 1 });
  const { properties, loading, error, total, pagination, refetch } = useProperties(filters);

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Gradient Header */}
      <div
        className="text-white px-6 pt-8 pb-12"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black mb-2">عقاراتي</h1>
            <p className="text-white/80 text-sm">إدارة عقاراتك: مسودة، قيد المراجعة، منشور، مرفوض</p>
          </div>
          <Link
            href="/dashboard/properties/new"
            className="bg-[var(--color-surface)] text-[--brand-navy] px-6 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition flex items-center gap-2"
          >
            <span className="text-lg">+</span> إضافة عقار
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 -mt-6 pb-12">
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-lg border p-6">
          <PropertyFilters onFilterChange={setFilters} />

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-gray-600 font-semibold">{error}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 inline-block px-6 py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: 'var(--brand-gradient)' }}
              >
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <>
              {properties.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🏠</div>
                  <p className="text-gray-500 font-semibold">لا توجد عقارات بعد</p>
                  <Link
                    href="/dashboard/properties/new"
                    className="mt-4 inline-block px-6 py-3 rounded-xl font-bold text-sm text-white"
                    style={{ background: 'var(--brand-gradient)' }}
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
                              ? 'text-white shadow-md'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                          style={i + 1 === pagination.page ? { background: 'var(--brand-gradient)' } : {}}
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
      </div>
    </div>
  );
}
