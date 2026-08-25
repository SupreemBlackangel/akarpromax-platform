'use client';
import { useState } from 'react';

interface PropertyFiltersProps {
  onFilterChange: (filters: { status: string; page: number; search?: string; dealType?: string }) => void;
}

const statusOptions = [
  { value: 'all', label: 'الكل' },
  { value: 'draft', label: 'مسودة' },
  { value: 'pending_review', label: 'قيد المراجعة' },
  { value: 'approved', label: 'مقبول' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'sold', label: 'مباع' },
  { value: 'rented', label: 'مؤجر' },
];

const dealTypeOptions = [
  { value: '', label: 'نوع الصفقة' },
  { value: 'sale', label: 'للبيع' },
  { value: 'rent', label: 'للإيجار' },
  { value: 'both', label: 'بيع/إيجار' },
];

export function PropertyFilters({ onFilterChange }: PropertyFiltersProps) {
  const [status, setStatus] = useState('all');
  const [dealType, setDealType] = useState('');
  const [search, setSearch] = useState('');

  const handleChange = (newStatus: string, newDealType: string, newSearch: string) => {
    setStatus(newStatus);
    setDealType(newDealType);
    setSearch(newSearch);
    onFilterChange({ status: newStatus, page: 1, dealType: newDealType, search: newSearch });
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="بحث بالعنوان أو المدينة..."
          value={search}
          onChange={(e) => handleChange(status, dealType, e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value, dealType, search)}
        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select
        value={dealType}
        onChange={(e) => handleChange(status, e.target.value, search)}
        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        {dealTypeOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
