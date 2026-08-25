'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PublicPageShell from '@/src/components/PublicPageShell';
import { translations } from '@/src/data/translations';
import type { ViewerContext } from '@/src/types/site';

type MockVehicle = {
  id: number;
  brand: string;
  model: string;
  year: number;
  price: number;
  type: string;
  location: string;
  description: string;
  features: string[];
};

const mockVehicles: Record<number, MockVehicle> = {
  1: {
    id: 1,
    brand: 'Toyota',
    model: 'Camry',
    year: 2022,
    price: 25000,
    type: 'Car',
    location: 'Riyadh',
    description: ' سيارة عائلية مريحة واقتصادية في استهلاك الوقود',
    features: ['نظام تدفئة المقاعد', 'شاشة لمس', 'تحكم أوتوماتيكي'],
  },
  2: {
    id: 2,
    brand: 'Ford',
    model: 'F-150',
    year: 2021,
    price: 45000,
    type: 'Truck',
    location: 'Jeddah',
    description: 'شاحنة قوية ومتينة مثالية للأعمال والرحلات',
    features: ['دفع رباعي', 'سرير شاحنة', 'مقاعد جلدية'],
  },
  3: {
    id: 3,
    brand: 'Honda',
    model: 'CBR500R',
    year: 2023,
    price: 8000,
    type: 'Motorcycle',
    location: 'Dammam',
    description: 'دراجة نارية رياضية ممتازة للقيادة في المدينة',
    features: ['نظام منع الانغلاق (ABS)', 'إضاءة LED'],
  },
  4: {
    id: 4,
    brand: 'BMW',
    model: 'X5',
    year: 2022,
    price: 75000,
    type: 'Truck',
    location: 'Riyadh',
    description: 'سائق رياضي فاخر ذو أداء قوي ومساحة واسعة',
    features: ['دفع رباعي', 'مقاعد جلدية', 'نظام صوتي'],
  },
  5: {
    id: 5,
    brand: 'Yamaha',
    model: 'MT-07',
    year: 2022,
    price: 7000,
    type: 'Motorcycle',
    location: 'Jeddah',
    description: 'دراجة نارية متعددة الاستخدامات ذات أداء مذهل',
    features: ['حزمتين من الطاقة', 'وضعية رياضية'],
  },
};

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const vehicle = mockVehicles[Number(id)];
  const [viewer] = useState<ViewerContext>({ authenticated: false, email: null, displayName: "Guest", role: "guest", countryCode: null, permissions: [] });

  if (!vehicle) {
    return <div className="p-8 text-center">المركبة غير موجودة</div>;
  }

  return (
    <PublicPageShell
      locale="ar"
      copy={translations.ar}
      viewer={viewer}
      country="sa"
      city="sa-riyadh"
      adLayout={{ mode: "standard", family: "knowledge", entityType: "vehicle", entityId: vehicle.id }}
      onLogin={() => {}}
      onLogout={() => {}}
    >
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{vehicle.brand} {vehicle.model}</h1>
          <p className="text-[var(--color-primary)] font-bold text-3xl mb-2">{vehicle.price} SAR</p>
          <p className="text-sm text-gray-500 mb-4">السنة: {vehicle.year} | النوع: {vehicle.type}</p>
          <p className="text-gray-700 mb-6">{vehicle.description}</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="font-semibold text-gray-700">الموقع</p>
              <p className="text-gray-500">{vehicle.location}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">نوع المركبة</p>
              <p className="text-gray-500">{vehicle.type}</p>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">المميزات</h3>
          <ul className="space-y-3 text-gray-700">
            {vehicle.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <span className="bg-[var(--color-primary-soft)] text-blue-800 text-xs rounded px-2 py-1 mr-2">●</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-8">
          <Link href="/vehicles" className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg hover:bg-[var(--color-primary-hover)] transition">
            العودة إلى قائمة المركبات
          </Link>
        </div>
      </div>
    </PublicPageShell>
  );
}
