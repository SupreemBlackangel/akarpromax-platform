'use client';

import { useMemo } from 'react';

import { useGeo } from '@/src/contexts/GeoContext';

export type AdvertisingLocation = {
  country: string;
  governorate: string;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  isGlobal: boolean;
};

export type LegacyAdvertisingCreative = {
  id: string;
  language?: string | null;
  title?: string | null;
  description?: string | null;
  cta?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  videoUrl?: string | null;
  /**
   * The token the engine minted for this impression.
   *
   * The server has always sent it -- toLegacyAdvertisingResult includes it --
   * but the type did not declare it, so no component could reach it and none
   * of them counted anything.
   */
  trackingToken?: string | null;
};

export type LegacyAdvertisingAd = {
  campaign: { id: string };
  creatives?: LegacyAdvertisingCreative[];
};

export type LegacyAdvertisingNews = {
  messageAr?: string | null;
  messageEn?: string | null;
  messageTr?: string | null;
};

export type LegacyFeaturedReference = { propertyId: string };

export type LegacyFeaturedProperty = {
  id: string;
  titleAr?: string | null;
  city?: string | null;
  area?: string | number | null;
  price?: string | number | null;
  media?: Array<{ url: string }>;
};

/** The central platform location is authoritative for every legacy ad slot. */
export function useAdvertisingLocation(): AdvertisingLocation {
  const geo = useGeo();
  return useMemo(() => ({
    country: geo.isGlobal ? '' : geo.countryCode,
    governorate: geo.isGlobal ? '' : geo.governorate,
    city: geo.isGlobal ? '' : geo.city,
    district: geo.isGlobal ? '' : geo.district,
    latitude: geo.isGlobal ? null : geo.latitude,
    longitude: geo.isGlobal ? null : geo.longitude,
    isGlobal: geo.isGlobal,
  }), [geo.city, geo.countryCode, geo.district, geo.governorate, geo.isGlobal, geo.latitude, geo.longitude]);
}

export function appendAdvertisingLocation(params: URLSearchParams, location: AdvertisingLocation): void {
  if (location.isGlobal) return;
  if (location.country) params.set('country', location.country);
  if (location.governorate) params.set('governorate', location.governorate);
  if (location.city) params.set('city', location.city);
  if (location.district) params.set('district', location.district);
  if (location.latitude != null) params.set('latitude', String(location.latitude));
  if (location.longitude != null) params.set('longitude', String(location.longitude));
}
