import { Suspense } from 'react';
import { LandDetailClient } from '@/src/components/land/LandDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Land Parcel | AkarProMax`, description: `Land parcel details` };
}

export default async function LandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        </div>
      }
    >
      <LandDetailClient id={id} />
    </Suspense>
  );
}
