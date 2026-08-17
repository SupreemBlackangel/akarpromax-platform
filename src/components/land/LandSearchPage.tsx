'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const LandMap = dynamic(() => import('@/src/components/land/LandMap').then(m => m.LandMap), { ssr: false });

type LandParcel = {
  id: string;
  title: string;
  type: string;
  status: string;
  area: string | null;
  price: string | null;
  currency: string;
  country: string;
  governorate: string;
  city: string;
  district: string | null;
  latitude: string | null;
  longitude: string | null;
  zoning: string | null;
  isVerified: boolean;
  views: number;
  favorites: number;
  createdAt: string;
};

type SearchFilters = {
  country: string;
  governorate: string;
  city: string;
  type: string;
  minArea: string;
  maxArea: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
};

const OMAN_GOVERNORATES = [
  'Muscat', 'Dhofar', 'Musandam', 'Al Buraimi', 'Al Dakhiliyah',
  'Al Batinah North', 'Al Batinah South', 'Ash Sharqiyah North',
  'Ash Sharqiyah South', 'Al Wusta', 'Ad Dhahirah',
];

const LAND_TYPES = ['residential', 'commercial', 'industrial', 'agricultural', 'vacant'];

export function LandSearchPage() {
  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedParcel, setSelectedParcel] = useState<LandParcel | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    country: 'om',
    governorate: '',
    city: '',
    type: '',
    minArea: '',
    maxArea: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
  });

  const fetchParcels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.country) params.set('country', filters.country);
      if (filters.governorate) params.set('governorate', filters.governorate);
      if (filters.city) params.set('city', filters.city);
      if (filters.type) params.set('type', filters.type);
      if (filters.minArea) params.set('minArea', filters.minArea);
      if (filters.maxArea) params.set('maxArea', filters.maxArea);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      params.set('sort', filters.sort);
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await fetch(`/api/land/search?${params}`);
      const data = await res.json();
      setParcels(data.parcels ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setParcels([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { (async () => { await fetchParcels(); })(); }, [fetchParcels]);

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Find My Land</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Search land parcels across Oman
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
              <h2 className="font-bold text-gray-900 dark:text-white">Filters</h2>

              <select
                value={filters.governorate}
                onChange={e => updateFilter('governorate', e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="">All Governorates</option>
                {OMAN_GOVERNORATES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="City"
                value={filters.city}
                onChange={e => updateFilter('city', e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              />

              <select
                value={filters.type}
                onChange={e => updateFilter('type', e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                {LAND_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min Area (sqm)"
                  value={filters.minArea}
                  onChange={e => updateFilter('minArea', e.target.value)}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max Area (sqm)"
                  value={filters.maxArea}
                  onChange={e => updateFilter('maxArea', e.target.value)}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min Price (OMR)"
                  value={filters.minPrice}
                  onChange={e => updateFilter('minPrice', e.target.value)}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max Price (OMR)"
                  value={filters.maxPrice}
                  onChange={e => updateFilter('maxPrice', e.target.value)}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>

              <select
                value={filters.sort}
                onChange={e => updateFilter('sort', e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="area_asc">Area: Small to Large</option>
                <option value="area_desc">Area: Large to Small</option>
              </select>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="h-80 rounded-xl overflow-hidden">
                <LandMap
                  parcels={parcels}
                  selectedParcel={selectedParcel}
                  onSelectParcel={setSelectedParcel}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {total} parcels found
              </p>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : parcels.length === 0 ? (
              <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-6xl mb-4">🏗️</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No parcels found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {parcels.map(parcel => (
                  <Link
                    key={parcel.id}
                    href={`/land/${parcel.id}`}
                    className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 transition hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md"
                    onMouseEnter={() => setSelectedParcel(parcel)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {parcel.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {parcel.city}, {parcel.governorate}
                        </p>
                      </div>
                      {parcel.isVerified && (
                        <span className="text-blue-500 text-xs font-bold">✓ Verified</span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{parcel.type}</span>
                      {parcel.area && <span>{Number(parcel.area).toLocaleString()} sqm</span>}
                    </div>
                    {parcel.price && (
                      <p className="mt-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                        {Number(parcel.price).toLocaleString()} {parcel.currency}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span>{parcel.views} views</span>
                      <span>{parcel.favorites} favorites</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {total > 20 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-500">Page {page}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={parcels.length < 20}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
