'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CompaniesDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/companies')
      .then(res => res.json())
      .then(data => { if (data.success) setCompanies(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">شركاتي</h1>
        <button onClick={() => router.push('/dashboard/companies/new')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">إضافة شركة</button>
      </div>
      {loading ? <p>جاري التحميل...</p> : companies.length === 0 ? <p className="text-gray-500">لا توجد شركات</p> : (companies as any[]).map((company: any) => (
        <div key={company.id} className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold">{company.name}</h3>
          <p className="text-sm text-gray-500">{company.city}</p>
        </div>
      ))}
    </div>
  );
}
