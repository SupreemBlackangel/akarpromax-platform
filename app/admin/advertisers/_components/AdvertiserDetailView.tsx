"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { AdvertiserProfile } from "@/src/types/advertiser";

const countries: Record<string, string> = {
  om: "عُمان", sa: "السعودية", ae: "الإمارات", qa: "قطر",
  kw: "الكويت", bh: "البحرين", eg: "مصر", jo: "الأردن",
  iq: "العراق", lb: "لبنان", ps: "فلسطين", sy: "سوريا",
  ye: "اليمن", ma: "المغرب", dz: "الجزائر", tn: "تونس",
  ly: "ليبيا", sd: "السودان", so: "الصومال", dj: "جيبوتي",
  mr: "موريتانيا", km: "جزر القمر", tr: "تركيا",
};

const statusLabels: Record<string, string> = {
  draft: "مسودة", pending: "قيد الانتظار", under_review: "قيد المراجعة",
  approved: "معتمد", active: "نشط", suspended: "موقوف",
  expired: "منتهي", rejected: "مرفوض", archived: "مؤرشف",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  under_review: "bg-[var(--color-primary-soft)] text-[var(--color-primary)] dark:bg-[var(--color-primary-soft)]/30 dark:text-[var(--color-primary)]",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  active: "bg-emerald-100 text-[var(--color-success)] dark:bg-[var(--color-success-soft)]/30 dark:text-[var(--color-success)]",
  suspended: "bg-red-100 text-[var(--color-error)] dark:bg-red-900/30 dark:text-red-400",
  rejected: "bg-red-100 text-[var(--color-error)] dark:bg-red-900/30 dark:text-red-400",
};

export default function AdvertiserDetailView() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<AdvertiserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    fetch(`/api/advertiser-profiles?id=${id}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setProfile(data))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>;
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center" dir="rtl">
        <p className="text-gray-500 dark:text-gray-400">المعلن غير موجود</p>
        <Link href="/admin/advertisers" className="text-[var(--color-primary)] hover:underline mt-2 inline-block">العودة إلى القائمة</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--color-surface)]">{profile.companyNameAr}</h1>
        <div className="flex gap-2">
          <Link href={`/admin/advertisers/${profile.id}/edit`} className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg transition-colors text-sm">
            تعديل
          </Link>
          <button onClick={() => router.push("/admin/advertisers")} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm">
            عودة
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[profile.status] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
              {statusLabels[profile.status] || profile.status}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{profile.advertiserCode}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="اسم الشركة (عربي)" value={profile.companyNameAr} />
            <Field label="اسم الشركة (إنجليزي)" value={profile.companyNameEn} />
            <Field label="⚑ الدولة" value={countries[profile.countryCode] || profile.countryCode.toUpperCase()} />
            <Field label="◈ المحافظة" value={profile.governorate} />
            <Field label="⌖ المدينة" value={profile.cityId} />
            <Field label="⊞ القرية" value={profile.village} />
            <Field label="▣ الحي" value={profile.districtId} />
            <Field label="⛩ الشارع" value={profile.street} />
            <Field label="البريد الإلكتروني" value={profile.email} />
            <Field label="رقم الهاتف" value={profile.phone} />
            <Field label="الشخص المسؤول" value={profile.contactName} />
            <Field label="السجل التجاري" value={profile.commercialRegistration} />
            <Field label="الرقم الضريبي" value={profile.taxNumber} />
            {profile.website && <Field label="الموقع الإلكتروني" value={profile.website} />}
            {profile.addressAr && (
              <div className="md:col-span-2">
                <Field label="العنوان" value={profile.addressAr} />
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
            <Field label="تاريخ الإنشاء" value={new Date(profile.createdAt).toLocaleDateString("ar")} />
            <Field label="آخر تحديث" value={new Date(profile.updatedAt).toLocaleDateString("ar")} />
            {profile.createdBy && <Field label="بواسطة" value={profile.createdBy} />}
            {profile.verifiedAt && <Field label="تاريخ التحقق" value={new Date(profile.verifiedAt).toLocaleDateString("ar")} />}
            {profile.approvedAt && <Field label="تاريخ الاعتماد" value={new Date(profile.approvedAt).toLocaleDateString("ar")} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 dark:text-[var(--color-surface)]">{value}</dd>
    </div>
  );
}
