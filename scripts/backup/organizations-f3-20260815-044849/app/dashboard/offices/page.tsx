'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OfficesDashboard() {
  const router = useRouter();
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/offices')
      .then(res => res.json())
      .then(data => { if (data.success) setOffices(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">مكاتب العقارية</h1>
        <button onClick={() => router.push('/dashboard/offices/new')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">إضافة مكتب</button>
      </div>
      {loading ? <p>جاري التحميل...</p> : offices.length === 0 ? <p className="text-gray-500">لا توجد مكاتب</p> : (offices as any[]).map((office: any) => (
        <div key={office.id} className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold">{office.name}</h3>
          <p className="text-sm text-gray-500">{office.city}</p>
        </div>
      ))}
    </div>
  );
}
