'use client';
import { useState, useEffect } from 'react';
import { appendAdvertisingLocation, useAdvertisingLocation, type LegacyAdvertisingNews } from './useAdvertisingLocation';

interface NewsTickerProps {
  page: string;
  country?: string;
  governorate?: string;
  city?: string;
  language?: string;
  speed?: 'slow' | 'medium' | 'fast';
}

export function NewsTicker({ page, language = 'ar', speed = 'medium' }: NewsTickerProps) {
  const location = useAdvertisingLocation();
  const [items, setItems] = useState<LegacyAdvertisingNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ page, language });
    appendAdvertisingLocation(params, location);
    fetch(`/api/advertising/match?${params.toString()}`)
      .then(res => res.json())
      .then((data: { success?: boolean; data?: { news?: LegacyAdvertisingNews[] } }) => { if (data.success) { setItems(data.data?.news || []); } setLoading(false); })
      .catch(() => setLoading(false));
  }, [language, location, page]);

  useEffect(() => {
    if (items.length > 1) {
      const intervals: Record<string, number> = { slow: 6000, medium: 4000, fast: 2000 };
      const timer = setInterval(() => setCurrentIndex((prev) => (prev + 1) % items.length), intervals[speed] || 4000);
      return () => clearInterval(timer);
    }
  }, [items, speed]);

  if (loading) return <div className="w-full h-10 bg-gray-200 animate-pulse" />;
  if (items.length === 0) return <div className="w-full h-10 bg-gray-100 flex items-center px-4 text-gray-400 text-sm">لا توجد أخبار</div>;

  const message = items[currentIndex];
  const text = language === 'en' ? message.messageEn : language === 'tr' ? message.messageTr : message.messageAr;

  return (
    <div className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        <span className="font-bold text-sm whitespace-nowrap">اخبار:</span>
        <div className="flex-1 overflow-hidden">
          <div className="whitespace-nowrap">
            <span className="text-sm">{text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
