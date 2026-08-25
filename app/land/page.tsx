import { Suspense } from 'react';
import { LandSearchPage } from '@/src/components/land/LandSearchPage';

export const metadata = {
  title: 'Find My Land | AkarProMax',
  description: 'Search and discover land parcels across Oman. Filter by location, type, price, and area.',
};

export default function LandPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        </div>
      }
    >
      <LandSearchPage />
    </Suspense>
  );
}
