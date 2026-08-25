'use client';

import { useState } from 'react';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useServicesPage } from '@/src/components/services/useServicesPage';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      });
      if (res.ok) { alert('تم إرسال رسالتك بنجاح'); setFormData({ name: '', email: '', phone: '', subject: '', message: '' }); }
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
        currentPath="/contact"
        pageHeader={{
          eyebrow: 'تواصل معنا',
          title: 'اتصل بنا',
          description: 'يسعدنا تواصلك معنا، فريقنا جاهز للإجابة عن استفساراتك.',
        }}
        adLayout={{ mode: 'standard', family: 'contact' }}
        onLogin={() => openLogin('login')}
        onLogout={handleLogout}
      >
        <div dir={dir} className="mx-auto w-full max-w-2xl px-5 py-10">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">الاسم *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none" required /></div>
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">البريد الإلكتروني *</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none" required /></div>
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">رقم الهاتف</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none" /></div>
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">الموضوع *</label><input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none" required /></div>
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">الرسالة *</label><textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="h-32 w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none" required /></div>
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover disabled:opacity-50">{loading ? 'جاري...' : 'إرسال'}</button>
          </form>
        </div>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}
