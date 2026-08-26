'use client';

import { useState } from 'react';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useServicesPage } from '@/src/components/services/useServicesPage';

// Real, requestable placements of the home family — same codes the serving
// engine matches on, so an approved request can go live without re-entry.
const PLACEMENT_OPTIONS = [
  { value: 'web_home_hero', canonical: 'HERO', label: 'الهيرو الرئيسي (أعلى الصفحة)' },
  { value: 'web_home_side_right_01', canonical: 'RIGHT_01', label: 'جانبي أول' },
  { value: 'web_home_side_left_01', canonical: 'LEFT_01', label: 'جانبي ثانٍ' },
  { value: 'web_home_bottom_01', canonical: 'BOTTOM_01', label: 'سفلي' },
];

export default function AdvertisePage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({ company: '', email: '', phone: '', placement: PLACEMENT_OPTIONS[0].value, targetUrl: '', message: '' });
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const option = PLACEMENT_OPTIONS.find((item) => item.value === formData.placement) ?? PLACEMENT_OPTIONS[0];
      const res = await fetch('/api/ads/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placement: option.value,
          canonical: option.canonical,
          family: 'home',
          countryCode: country || 'om',
          city,
          advertiserName: formData.company,
          contactEmail: formData.email,
          contactPhone: formData.phone,
          targetUrl: formData.targetUrl,
          message: formData.message || undefined,
        }),
      });
      const data = await res.json().catch(() => null) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || 'تعذر إرسال الطلب، حاول مرة أخرى');
      setStatus({ kind: 'ok', text: 'تم استلام طلبك وهو الآن قيد مراجعة الإدارة. سيتم التواصل معك عبر بريدك الإلكتروني.' });
      setFormData({ company: '', email: '', phone: '', placement: PLACEMENT_OPTIONS[0].value, targetUrl: '', message: '' });
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'تعذر إرسال الطلب، حاول مرة أخرى' });
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
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">المساحة المطلوبة *</label><select value={formData.placement} onChange={(e) => setFormData({ ...formData, placement: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none" required>{PLACEMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">رابط موقعك أو صفحتك *</label><input type="url" dir="ltr" value={formData.targetUrl} onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })} placeholder="https://example.com" className="w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none" required /></div>
            <div><label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">وصف الإعلان (اختياري)</label><textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="h-32 w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm focus:border-primary focus:outline-none" /></div>
            {status && <p role={status.kind === 'error' ? 'alert' : 'status'} className={status.kind === 'error' ? 'rounded-lg bg-[var(--color-danger-soft)] p-3 text-sm font-semibold text-[var(--color-danger)]' : 'rounded-lg bg-[var(--color-success-soft)] p-3 text-sm font-semibold text-[var(--color-success)]'}>{status.text}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover disabled:opacity-50">{loading ? 'جاري الإرسال...' : 'إرسال الطلب'}</button>
          </form>
        </div>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}
