"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AdvertiserProfile } from "@/src/types/advertiser";
import LocationPicker from "@/src/components/LocationPicker";
import type { LocationFields } from "@/src/location-utils";

const countries: Array<[string, string]> = [
  ["om", "عُمان"], ["sa", "السعودية"], ["ae", "الإمارات"], ["qa", "قطر"],
  ["kw", "الكويت"], ["bh", "البحرين"], ["eg", "مصر"], ["jo", "الأردن"],
  ["iq", "العراق"], ["lb", "لبنان"], ["ps", "فلسطين"], ["sy", "سوريا"],
  ["ye", "اليمن"], ["ma", "المغرب"], ["dz", "الجزائر"], ["tn", "تونس"],
  ["ly", "ليبيا"], ["sd", "السودان"], ["so", "الصومال"], ["dj", "جيبوتي"],
  ["mr", "موريتانيا"], ["km", "جزر القمر"], ["tr", "تركيا"],
];

export default function EditAdvertiserForm() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<AdvertiserProfile | null>(null);
  const locationRef = useRef<LocationFields | null>(null);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    fetch(`/api/advertiser-profiles?id=${id}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setProfile(data))
      .finally(() => setFetching(false));
  }, [params?.id]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const loc = locationRef.current;
    const body: Record<string, unknown> = {
      id: params?.id,
      companyNameAr: form.get("companyNameAr"),
      companyNameEn: form.get("companyNameEn"),
      countryCode: form.get("countryCode"),
      email: form.get("email"),
      phone: form.get("phone"),
      contactName: form.get("contactName"),
      website: form.get("website"),
      commercialRegistration: form.get("commercialRegistration"),
      taxNumber: form.get("taxNumber"),
      addressAr: form.get("addressAr"),
      governorate: loc?.governorate || undefined,
      village: loc?.village || undefined,
      street: loc?.street || undefined,
    };

    try {
      const res = await fetch("/api/advertiser-profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث المعلن");
      }
      router.push(`/admin/advertisers/${params?.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>;
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center" dir="rtl">
        <p className="text-gray-500 dark:text-gray-400">المعلن غير موجود</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6" dir="rtl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-[var(--color-text-primary)]">تعديل المعلن: {profile.companyNameAr}</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-[var(--color-error)] dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الشركة (عربي) *</label>
            <input name="companyNameAr" defaultValue={profile.companyNameAr} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-gray-900 dark:text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الشركة (إنجليزي) *</label>
            <input name="companyNameEn" defaultValue={profile.companyNameEn} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-gray-900 dark:text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدولة *</label>
            <select name="countryCode" defaultValue={profile.countryCode} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-gray-900 dark:text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]">
              {countries.map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
            <input name="email" type="email" defaultValue={profile.email || ""} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-gray-900 dark:text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف</label>
            <input name="phone" defaultValue={profile.phone || ""} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-gray-900 dark:text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الشخص المسؤول</label>
            <input name="contactName" defaultValue={profile.contactName || ""} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-gray-900 dark:text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الموقع الإلكتروني</label>
          <input name="website" type="url" defaultValue={profile.website || ""} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-gray-900 dark:text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]" />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الموقع الجغرافي</label>
          <LocationPicker locale="ar" onChange={(fields) => { locationRef.current = fields; }}
            defaultValues={{ countryCode: profile.countryCode, governorate: profile.governorate || "", city: profile.cityId || "", village: profile.village || "", district: profile.districtId || "", street: profile.street || "" }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السجل التجاري</label>
            <input name="commercialRegistration" defaultValue={profile.commercialRegistration || ""} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-gray-900 dark:text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الرقم الضريبي</label>
            <input name="taxNumber" defaultValue={profile.taxNumber || ""} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-gray-900 dark:text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
          <textarea name="addressAr" defaultValue={profile.addressAr || ""} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-gray-900 dark:text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]" />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={loading} className="px-6 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white rounded-lg transition-colors">
            {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
