'use client';
import { useRouter } from 'next/navigation';
import { Star, MapPin, CheckCircle } from 'lucide-react';

interface CompanyCardProps {
  company: {
    id: string;
    name: string;
    logo?: string;
    city?: string;
    rating?: string;
    specialties?: string[];
    isVerified?: boolean;
    rank?: string;
  };
}

export function CompanyCard({ company }: CompanyCardProps) {
  const router = useRouter();
  const rankColors: Record<string, string> = {
    NEW: 'bg-gray-100 text-gray-600',
    RISING: 'bg-green-100 text-green-700',
    DISTINGUISHED: 'bg-blue-100 text-blue-700',
    GOLD: 'bg-yellow-100 text-yellow-700',
    PROMax: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-4 cursor-pointer" onClick={() => router.push(`/companies/${company.id}`)}>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
          {company.logo ? <img src={company.logo} alt={company.name} width={64} height={64} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-2xl bg-purple-100 text-purple-600">🏭</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg truncate">{company.name}</h3>
            {company.isVerified && <CheckCircle className="w-4 h-4 text-[color:var(--color-primary)] flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rankColors[company.rank || 'NEW'] || rankColors.NEW}`}>{company.rank || 'NEW'}</span>
            {company.rating && <span className="flex items-center text-sm text-yellow-600"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />{parseFloat(company.rating).toFixed(1)}</span>}
            {company.city && <span className="flex items-center text-sm text-gray-500"><MapPin className="w-3 h-3 mr-1" />{company.city}</span>}
          </div>
          {company.specialties && company.specialties.length > 0 && <div className="mt-1 flex flex-wrap gap-1"><span className="text-xs text-gray-500">{company.specialties.slice(0, 3).join(' • ')}</span></div>}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t text-sm text-right"><span className="text-[color:var(--color-primary)] hover:text-[color:var(--color-primary-hover)] font-medium">عرض الشركة →</span></div>
    </div>
  );
}
