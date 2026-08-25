'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  roadAccess: string | null;
  utilities: Record<string, unknown> | null;
  features: Record<string, unknown> | null;
  isVerified: boolean;
  views: number;
  favorites: number;
  description: string | null;
  createdAt: string;
};

export function LandDetailClient({ id }: { id: string }) {
  const [parcel, setParcel] = useState<LandParcel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/land/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setParcel)
      .catch(() => setError('Land parcel not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  if (error || !parcel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">🏗️</div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Land Parcel Not Found</h1>
        <Link href="/land" className="text-[var(--color-primary)] hover:underline">Back to Search</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/land" className="text-sm text-[var(--color-primary)] hover:underline mb-4 inline-block">
          ← Back to Search
        </Link>

        <div className="bg-[var(--color-surface)] dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">{parcel.title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {parcel.district ? `${parcel.district}, ` : ''}{parcel.city}, {parcel.governorate}, {parcel.country}
              </p>
            </div>
            {parcel.isVerified && (
              <span className="px-3 py-1 rounded-full bg-[var(--color-primary-soft)] dark:bg-blue-900/30 text-[var(--color-primary)] dark:text-[var(--color-primary)] text-xs font-bold">
                ✓ Verified
              </span>
            )}
          </div>

          {parcel.description && (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{parcel.description}</p>
          )}

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
              <p className="font-bold text-gray-900 dark:text-white capitalize">{parcel.type}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Area</p>
              <p className="font-bold text-gray-900 dark:text-white">
                {parcel.area ? `${Number(parcel.area).toLocaleString()} sqm` : '—'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
              <p className="font-bold text-[var(--color-primary)] dark:text-blue-400">
                {parcel.price ? `${Number(parcel.price).toLocaleString()} ${parcel.currency}` : '—'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
              <p className="font-bold text-gray-900 dark:text-white capitalize">{parcel.status}</p>
            </div>
          </div>

          {parcel.zoning && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Zoning</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{parcel.zoning}</p>
            </div>
          )}

          {parcel.roadAccess && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Road Access</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{parcel.roadAccess}</p>
            </div>
          )}

          {parcel.utilities && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Utilities</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(parcel.utilities).map(([key, val]) => (
                  Boolean(val) && (
                    <span key={key} className="px-2 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                      {key}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}

          {parcel.features && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Features</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(parcel.features).map(([key, val]) => (
                  Boolean(val) && (
                    <span key={key} className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs">
                      {key}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4 text-xs text-gray-400">
            <span>{parcel.views} views</span>
            <span>{parcel.favorites} favorites</span>
            <span>Listed {new Date(parcel.createdAt).toLocaleDateString()}</span>
          </div>

          {parcel.latitude && parcel.longitude && (
            <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs text-gray-500">
              📍 {parcel.latitude}, {parcel.longitude}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
