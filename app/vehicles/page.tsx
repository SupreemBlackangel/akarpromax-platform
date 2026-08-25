export default function VehiclesPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-gray-900">
      <h1 className="text-3xl font-bold py-8 text-center">المركبات للبيع</h1>
      <p className="text-center text-gray-600">اكتشف أفضل المركبات في المملكة العربية السعودية</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-900 mb-2">Toyota Camry 2022</h3>
          <p className="text-[var(--color-primary)] font-bold text-lg">25,000 SAR</p>
          <p className="text-sm text-gray-500">الموقع: الرياض</p>
          <p className="text-sm text-gray-500">النوع: سيارة</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-900 mb-2">Ford F-150 2021</h3>
          <p className="text-[var(--color-primary)] font-bold text-lg">45,000 SAR</p>
          <p className="text-sm text-gray-500">الموقع: جدة</p>
          <p className="text-sm text-gray-500">النوع: شاحنة</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-900 mb-2">Honda CBR500R 2023</h3>
          <p className="text-[var(--color-primary)] font-bold text-lg">8,000 SAR</p>
          <p className="text-sm text-gray-500">الموقع: الدمام</p>
          <p className="text-sm text-gray-500">النوع: دراجة نارية</p>
        </div>
      </div>
    </div>
  );
}