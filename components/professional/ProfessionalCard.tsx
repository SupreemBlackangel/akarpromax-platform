'use client';
import { useRouter } from 'next/navigation';
import { Star, MapPin, CheckCircle, Clock } from 'lucide-react';

interface ProfessionalCardProps {
  professional: {
    id: string;
    userId: string;
    businessName: string;
    bio?: string;
    city?: string;
    rating?: string;
    ratingCount?: number;
    jobsCompleted?: number;
    isVerified?: boolean;
    availability?: boolean;
    rank?: string;
    avatar?: string;
    categoryName?: string;
  };
}

export function ProfessionalCard({ professional }: ProfessionalCardProps) {
  const router = useRouter();
  const rankColors: Record<string, string> = {
    NEW: 'bg-gray-100 text-gray-600',
    RISING: 'bg-green-100 text-green-700',
    DISTINGUISHED: 'bg-blue-100 text-blue-700',
    GOLD: 'bg-yellow-100 text-yellow-700',
    PROMax: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-4 cursor-pointer" onClick={() => router.push(`/providers/${professional.id}`)}>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {professional.avatar ? <img src={professional.avatar} alt={professional.businessName} width={64} height={64} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-2xl bg-blue-600 text-white">👤</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg truncate">{professional.businessName}</h3>
            {professional.isVerified && <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />}
          </div>
          <p className="text-sm text-gray-600">{professional.categoryName || 'مهني'}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rankColors[professional.rank || 'NEW'] || rankColors.NEW}`}>{professional.rank || 'NEW'}</span>
            {professional.rating && <span className="flex items-center text-sm text-yellow-600"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />{parseFloat(professional.rating).toFixed(1)}</span>}
            {professional.city && <span className="flex items-center text-sm text-gray-500"><MapPin className="w-3 h-3 mr-1" />{professional.city}</span>}
            <span className={`flex items-center text-sm ${professional.availability ? 'text-green-600' : 'text-gray-400'}`}><Clock className="w-3 h-3 mr-1" />{professional.availability ? 'متاح' : 'غير متاح'}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t text-sm text-gray-500 flex justify-between">
        <span>{professional.jobsCompleted || 0} عمل مكتمل</span>
        <span className="text-blue-600 hover:text-blue-800 font-medium">عرض الملف →</span>
      </div>
    </div>
  );
}
