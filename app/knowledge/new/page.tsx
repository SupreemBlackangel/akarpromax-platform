'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import { useRouter } from 'next/navigation';
import PublicPageShell from '@/src/components/PublicPageShell';

const COPY = {
  ar: {
    title: 'إضافة مورد جديد',
    add: 'إضافة المورد',
    cancel: 'إلغاء',
    back: 'العودة للمكتبة',
  },
  en: {
    title: 'Add New Resource',
    add: 'Add Resource',
    cancel: 'Cancel',
    back: 'Back to Library',
  },
  tr: {
    title: 'Yeni Kaynak Ekle',
    add: 'Kaynak Ekle',
    cancel: 'İptal',
    back: 'Kütüphaneye Dön',
  },
};

export default function NewKnowledgeItemPage() {
  const { locale, copy: _copy, viewer, country, city, openLogin, handleLogout } = useServicesPage();
  const router = useRouter();
  const t = COPY[locale as 'ar' | 'en' | 'tr'] ?? COPY.ar;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    type: 'book',
    titleAr: '',
    titleEn: '',
    descriptionAr: '',
    descriptionEn: '',
    category: '',
    vendor: '',
    cover: '',
    fileUrl: '',
    fileSize: '',
    mimeType: '',
    version: '',
    language: 'ar',
    isFree: true,
  });

  const TYPES = [
    { value: 'book', label: 'كتاب' },
    { value: 'software', label: 'برنامج' },
    { value: 'document', label: 'وثيقة' },
    { value: 'resource', label: 'مورد' },
  ];

  const LANGS = [
    { value: 'ar', label: 'العربية' },
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Türkçe' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fileSize: formData.fileSize ? parseInt(formData.fileSize, 10) : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        router.push('/knowledge');
      } else if (res.status === 401) {
        setError('يجب تسجيل الدخول أولاً لإضافة مورد');
      } else {
        setError(data?.error || 'حدث خطأ في إضافة المورد');
      }
    } catch {
      setError('فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const input = (label: string, key: keyof typeof formData, required = false, placeholder = '') => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}{required ? ' *' : ''}</label>
      <input
        type="text"
        value={formData[key] as string}
        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
        className="w-full p-2 border rounded"
        placeholder={placeholder}
        required={required}
      />
    </div>
  );

  return (
    <PublicPageShell
      locale={locale as 'ar' | 'en' | 'tr'}
      copy={_copy}
      viewer={viewer}
      country={country}
      city={city}
      onLogin={() => openLogin('login')}
      onLogout={handleLogout}
      adLayout={{ mode: 'standard', family: 'knowledge' }}
    >
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Link href="/knowledge" className="text-[var(--color-primary)] hover:underline mb-4 inline-block">&larr; العودة للمكتبة</Link>
          <h1 className="text-2xl font-bold mb-6">{t.title}</h1>

          {error && (
            <div className="p-4 bg-[var(--color-error-soft)] border border-[var(--color-error)]/30 rounded-lg text-[var(--color-error)] mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 bg-[var(--color-surface)] rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">النوع *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                >
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">اللغة</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  {LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            {input('العنوان (عربي)', 'titleAr', true)}
            {input('العنوان (إنجليزي)', 'titleEn')}

            <div>
              <label className="block text-sm font-medium mb-1">الوصف (عربي) *</label>
              <textarea
                value={formData.descriptionAr}
                onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                className="w-full p-2 border rounded h-24"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الوصف (إنجليزي)</label>
              <textarea
                value={formData.descriptionEn}
                onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                className="w-full p-2 border rounded h-24"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {input('التصنيف', 'category')}
              {input('الناشر/المطور', 'vendor')}
              {input('الإصدار', 'version')}
              {input('رابط الغلاف', 'cover')}
              {input('نوع الملف (mime)', 'mimeType')}
              {input('حجم الملف (بايت)', 'fileSize')}
              {input('رابط الملف *', 'fileUrl', true, 'https://...')}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={formData.isFree}
                  onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                  className="w-4 h-4"
                />
                مورد مجاني
              </label>
            </div>

            <div className="flex gap-4">
              <button type="submit" disabled={loading} className="px-6 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
                {loading ? 'جاري...' : t.add}
              </button>
              <button type="button" onClick={() => router.back()} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">{t.cancel}</button>
            </div>
          </form>
        </div>
      </div>
    </PublicPageShell>
  );
}