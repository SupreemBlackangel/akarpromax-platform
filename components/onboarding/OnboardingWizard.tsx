'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', specialty: '', city: '', organizationName: '', inviteCode: '' });

  const handleChoice = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice, ...formData }),
      });
      if (res.ok) { router.push('/dashboard'); } else { alert('حدث خطأ'); }
    } finally { setLoading(false); }
  };

  if (step === 1) return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-center mb-6">كيف تريد استخدام عقار بروماكس؟</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { value: 'normal', label: 'متابعة كمستخدم عادي', icon: '👤', desc: 'تصفح العقارات والخدمات' },
          { value: 'professional', label: 'أنا حرفي أو مهني', icon: '🛠️', desc: 'أنشئ ملفك المهني واستقبل طلبات العملاء' },
          { value: 'office', label: 'لدي مكتب عقاري', icon: '🏢', desc: 'أنشئ مكتباً عقارياً أو انضم إلى مكتب موجود' },
          { value: 'company', label: 'لدي شركة', icon: '🏭', desc: 'أنشئ صفحة شركتك أو انضم إلى شركة موجودة' },
          { value: 'invite', label: 'لدي دعوة للانضمام', icon: '📨', desc: 'انضم إلى منظمة باستخدام رمز الدعوة' },
        ].map((opt) => (
          <button key={opt.value} onClick={() => { setChoice(opt.value); setStep(2); }} className="p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-right">
            <div className="text-2xl">{opt.icon}</div>
            <div className="font-semibold">{opt.label}</div>
            <div className="text-sm text-gray-500">{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-center mb-6">أكمل بياناتك</h2>
      <div className="space-y-4">
        {choice === 'professional' && (
          <>
            <input className="w-full p-3 border rounded" placeholder="اسم المهنة (مثل: فني كهرباء)" value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} />
            <input className="w-full p-3 border rounded" placeholder="المدينة" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
          </>
        )}
        {(choice === 'office' || choice === 'company') && (
          <>
            <input className="w-full p-3 border rounded" placeholder="اسم المنظمة" value={formData.organizationName} onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })} />
            <input className="w-full p-3 border rounded" placeholder="المدينة" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
          </>
        )}
        {choice === 'invite' && (
          <input className="w-full p-3 border rounded" placeholder="رمز الدعوة" value={formData.inviteCode} onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })} />
        )}
        <button onClick={handleChoice} disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">{loading ? 'جاري...' : 'متابعة'}</button>
      </div>
    </div>
  );
}
