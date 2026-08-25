'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { matchesGeoAlias } from '@/lib/geo/platform-location';

const PropertyLocationMap = dynamic(() => import('./PropertyLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] w-full rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
  ),
});

type GeoOption = {
  id: string;
  code?: string | null;
  nameAr: string;
  nameEn: string;
  nameTr?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  mapCenterLat?: number | null;
  mapCenterLng?: number | null;
  defaultZoom?: number | null;
};

export type GeoAddressValue = {
  country: string;
  governorate: string;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  value: GeoAddressValue;
  onChange: (next: GeoAddressValue) => void;
  errors?: { country?: string; governorate?: string; city?: string };
  showMap?: boolean;
};

function optionValue(option: GeoOption): string {
  return option.code?.trim() || option.id;
}

function selectedOption(options: GeoOption[], value: string): GeoOption | null {
  if (!value) return null;
  return options.find((option) => matchesGeoAlias(option, value)) ?? null;
}

async function fetchGeo(type: 'governorates' | 'cities' | 'districts', parentId: string): Promise<GeoOption[]> {
  try {
    const query = new URLSearchParams({ type, parentId });
    const response = await fetch(`/api/geo?${query.toString()}`, { cache: 'no-store' });
    if (!response.ok) return [];
    const body = await response.json();
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753, zoom: 6 };

/**
 * Canonical multi-country address selector for the property form.
 * Country → Governorate → City → District, all served by /api/geo (the same
 * centralized registry the marketplace filters resolve against), storing the
 * same canonical codes. No hardcoded country lists, no Saudi-only logic.
 */
export default function GeoAddressPicker({ value, onChange, errors, showMap = true }: Props) {
  const [countries, setCountries] = useState<GeoOption[]>([]);
  const [countriesError, setCountriesError] = useState(false);
  const [governorateRows, setGovernorateRows] = useState<{ parentId: string; rows: GeoOption[] }>({ parentId: '', rows: [] });
  const [cityRows, setCityRows] = useState<{ parentId: string; rows: GeoOption[] }>({ parentId: '', rows: [] });
  const [districtRows, setDistrictRows] = useState<{ parentId: string; rows: GeoOption[] }>({ parentId: '', rows: [] });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/geo?type=countries', { cache: 'no-store' });
        if (!response.ok) throw new Error(String(response.status));
        const body = await response.json();
        const rows = Array.isArray(body) ? body : body.data ?? [];
        if (active) {
          setCountries(rows);
          setCountriesError(rows.length === 0);
        }
      } catch {
        if (active) setCountriesError(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const country = useMemo(() => selectedOption(countries, value.country), [countries, value.country]);
  const governorates = useMemo(
    () => (country && governorateRows.parentId === country.id ? governorateRows.rows : []),
    [country, governorateRows],
  );
  const governorate = useMemo(() => selectedOption(governorates, value.governorate), [governorates, value.governorate]);
  const cities = useMemo(
    () => (governorate && cityRows.parentId === governorate.id ? cityRows.rows : []),
    [governorate, cityRows],
  );
  const city = useMemo(() => selectedOption(cities, value.city), [cities, value.city]);
  const districts = useMemo(
    () => (city && districtRows.parentId === city.id ? districtRows.rows : []),
    [city, districtRows],
  );
  const district = useMemo(() => selectedOption(districts, value.district), [districts, value.district]);

  useEffect(() => {
    let active = true;
    if (!country?.id) return () => { active = false; };
    void fetchGeo('governorates', country.id).then((rows) => {
      if (active) setGovernorateRows({ parentId: country.id, rows });
    });
    return () => { active = false; };
  }, [country?.id]);

  useEffect(() => {
    let active = true;
    if (!governorate?.id) return () => { active = false; };
    void fetchGeo('cities', governorate.id).then((rows) => {
      if (active) setCityRows({ parentId: governorate.id, rows });
    });
    return () => { active = false; };
  }, [governorate?.id]);

  useEffect(() => {
    let active = true;
    if (!city?.id) return () => { active = false; };
    void fetchGeo('districts', city.id).then((rows) => {
      if (active) setDistrictRows({ parentId: city.id, rows });
    });
    return () => { active = false; };
  }, [city?.id]);

  const mapCenter = useMemo(() => {
    const cityLat = city?.latitude != null ? Number(city.latitude) : null;
    const cityLng = city?.longitude != null ? Number(city.longitude) : null;
    if (cityLat != null && cityLng != null && Number.isFinite(cityLat) && Number.isFinite(cityLng)) {
      return { lat: cityLat, lng: cityLng, zoom: 12 };
    }
    if (country?.mapCenterLat != null && country?.mapCenterLng != null) {
      return { lat: Number(country.mapCenterLat), lng: Number(country.mapCenterLng), zoom: country.defaultZoom ?? 6 };
    }
    return DEFAULT_CENTER;
  }, [city, country]);

  const selectClass = 'w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm cursor-pointer hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed';
  const labelClass = 'block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5';
  const errClass = 'text-red-600 text-xs mt-1';

  return (
    <div className="space-y-4">
      {countriesError && (
        <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800">
          تعذر تحميل قائمة الدول من الخادم. أعد المحاولة لاحقاً — لا يمكن حفظ الموقع بدون اختيار الدولة.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>الدولة *</label>
          <select
            value={country ? optionValue(country) : value.country}
            onChange={(e) => onChange({ ...value, country: e.target.value, governorate: '', city: '', district: '' })}
            className={selectClass}
            required
          >
            <option value="">اختر الدولة</option>
            {!country && value.country && <option value={value.country}>{value.country}</option>}
            {countries.map((option) => (
              <option key={option.id} value={optionValue(option)}>{option.nameAr}</option>
            ))}
          </select>
          {errors?.country && <p className={errClass}>{errors.country}</p>}
        </div>
        <div>
          <label className={labelClass}>المنطقة / المحافظة *</label>
          <select
            value={governorate ? optionValue(governorate) : value.governorate}
            onChange={(e) => onChange({ ...value, governorate: e.target.value, city: '', district: '' })}
            className={selectClass}
            disabled={!country || governorates.length === 0}
            required
          >
            <option value="">{!country ? 'اختر الدولة أولاً' : governorates.length === 0 ? 'جارٍ التحميل / لا توجد مناطق' : 'اختر المنطقة'}</option>
            {!governorate && value.governorate && <option value={value.governorate}>{value.governorate}</option>}
            {governorates.map((option) => (
              <option key={option.id} value={optionValue(option)}>{option.nameAr}</option>
            ))}
          </select>
          {errors?.governorate && <p className={errClass}>{errors.governorate}</p>}
        </div>
        <div>
          <label className={labelClass}>المدينة *</label>
          <select
            value={city ? optionValue(city) : value.city}
            onChange={(e) => {
              const next = selectedOption(cities, e.target.value);
              const lat = next?.latitude != null ? Number(next.latitude) : null;
              const lng = next?.longitude != null ? Number(next.longitude) : null;
              onChange({
                ...value,
                city: e.target.value,
                district: '',
                latitude: value.latitude ?? (Number.isFinite(lat as number) ? lat : null),
                longitude: value.longitude ?? (Number.isFinite(lng as number) ? lng : null),
              });
            }}
            className={selectClass}
            disabled={!governorate || cities.length === 0}
            required
          >
            <option value="">{!governorate ? 'اختر المنطقة أولاً' : cities.length === 0 ? 'جارٍ التحميل / لا توجد مدن' : 'اختر المدينة'}</option>
            {!city && value.city && <option value={value.city}>{value.city}</option>}
            {cities.map((option) => (
              <option key={option.id} value={optionValue(option)}>{option.nameAr}</option>
            ))}
          </select>
          {errors?.city && <p className={errClass}>{errors.city}</p>}
        </div>
        <div>
          <label className={labelClass}>الحي</label>
          <select
            value={district ? optionValue(district) : value.district}
            onChange={(e) => onChange({ ...value, district: e.target.value })}
            className={selectClass}
            disabled={!city || districts.length === 0}
          >
            <option value="">{!city ? 'اختر المدينة أولاً' : districts.length === 0 ? 'بدون تحديد حي' : 'اختر الحي (اختياري)'}</option>
            {!district && value.district && <option value={value.district}>{value.district}</option>}
            {districts.map((option) => (
              <option key={option.id} value={optionValue(option)}>{option.nameAr}</option>
            ))}
          </select>
        </div>
      </div>

      {showMap && (
        <div>
          <label className={labelClass}>الموقع على الخريطة (انقر لتحديد الإحداثيات)</label>
          <PropertyLocationMap
            latitude={value.latitude}
            longitude={value.longitude}
            center={mapCenter}
            onPick={(lat, lng) => onChange({ ...value, latitude: lat, longitude: lng })}
          />
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>خط العرض (Latitude)</label>
              <input
                type="number"
                step="any"
                value={value.latitude ?? ''}
                onChange={(e) => onChange({ ...value, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                className={selectClass}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelClass}>خط الطول (Longitude)</label>
              <input
                type="number"
                step="any"
                value={value.longitude ?? ''}
                onChange={(e) => onChange({ ...value, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                className={selectClass}
                dir="ltr"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
