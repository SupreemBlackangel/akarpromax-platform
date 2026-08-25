'use client';

import { useState } from 'react';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useServicesPage } from '@/src/components/services/useServicesPage';

export default function AdvertisePage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ company: '', email: '', phone: '', placement: '', message: '' });
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/advertising/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      });
      if (res.ok) { alert('تم إرسال طلب الإعلان بنجاح'); setFormData({ company: '', email: '', phone: '', placement: '', message: '' }); }
    } finally { setLoading(false); }
  };

  return (
    <>
      <PublicPageShell
        locale={locale}
        copy={copy}
        viewer={viewer}
        country={country}
        city={city}
        currentPath="/advertise"
        pageHeader={{
          eyebrow: 'فرص إعلانية',
          title: 'اعلن معنا',
          description: 'وصّل علامتك التجارية إلى آلاف المشترين والمستأجرين في منصة عقار بروماكس.',
        }}
        adLayout={{ mode: 'standard', family: 'advertise' }}
        onLogin={() => openLogin('login')}
        onLogout={handleLogout}
      >
        <div dir={dir} className="mx-auto w-full max-w-2xl px-5 py-10">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">اسم الشركة *</label><input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none" required /></div>
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">البريد الإلكتروني *</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none" required /></div>
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">رقم الهاتف *</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none" required /></div>
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">المساحة المطلوبة</label><select value={formData.placement} onChange={(e) => setFormData({ ...formData, placement: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none"><option value="">اختر</option><option value="hero">الهيرو</option><option value="sidebar">جانبية</option><option value="bottom">سفلية</option></select></div>
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">الرسالة *</label><textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="h-32 w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none" required /></div>
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover disabled:opacity-50">{loading ? 'جاري...' : 'إرسال الطلب'}</button>
          </form>
        </div>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}
