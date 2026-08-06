"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { SponsorProfile } from "@/src/types/sponsor";

const statusLabels: Record<string, string> = {
  draft: "مسودة", pending: "بانتظار", under_review: "قيد المراجعة",
  approved: "معتمد", active: "نشط", suspended: "موقوف",
  rejected: "مرفوض", archived: "مؤرشف",
};
const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  under_review: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  archived: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};
const countries: Record<string, string> = {
  om: "عُمان", sa: "السعودية", ae: "الإمارات", qa: "قطر",
  kw: "الكويت", bh: "البحرين", eg: "مصر", jo: "الأردن",
  iq: "العراق", lb: "لبنان", ps: "فلسطين", sy: "سوريا",
  ye: "اليمن", ma: "المغرب", dz: "الجزائر", tn: "تونس",
  ly: "ليبيا", sd: "السودان", so: "الصومال", dj: "جيبوتي",
  mr: "موريتانيا", km: "جزر القمر", tr: "تركيا",
};

export default function SponsorsListView() {
  const [profiles, setProfiles] = useState<SponsorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterGovernorate, setFilterGovernorate] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterVillage, setFilterVillage] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterStreet, setFilterStreet] = useState("");

  function fetchAll() {
    setLoading(true);
    fetch("/api/sponsor-profiles").then(r => r.ok ? r.json() : []).then(d => setProfiles(d)).finally(() => setLoading(false));
  }
  useEffect(() => { window.queueMicrotask(() => fetchAll()); }, []);

  const filtered = useMemo(() => {
    return profiles.filter(p => {
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterCountry && p.countryCode !== filterCountry) return false;
      if (filterGovernorate && !(p.governorate || "").toLowerCase().includes(filterGovernorate.toLowerCase())) return false;
      if (filterCity && !(p.cityId || "").toLowerCase().includes(filterCity.toLowerCase())) return false;
      if (filterVillage && !(p.village || "").toLowerCase().includes(filterVillage.toLowerCase())) return false;
      if (filterDistrict && !(p.districtId || "").toLowerCase().includes(filterDistrict.toLowerCase())) return false;
      if (filterStreet && !(p.street || "").toLowerCase().includes(filterStreet.toLowerCase())) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.companyNameAr.toLowerCase().includes(q) && !p.companyNameEn.toLowerCase().includes(q) && !(p.email || "").toLowerCase().includes(q) && !(p.phone || "").includes(q) && !p.sponsorCode.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [profiles, search, filterStatus, filterCountry, filterGovernorate, filterCity, filterVillage, filterDistrict, filterStreet]);

  const statuses = useMemo(() => [...new Set(profiles.map(p => p.status))], [profiles]);

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الرعاة</h1>
        <div className="flex gap-2">
          <Link href="/admin/sponsors/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
            + إضافة راعٍ
          </Link>
          <Link href="/admin/sponsors/banner" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors">
            الرعاة البانر
          </Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text" placeholder="بحث بالاسم أو البريد أو الهاتف..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm min-w-[200px]"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
          <option value="">كل الحالات</option>
          {statuses.map(s => <option key={s} value={s}>{statusLabels[s] || s}</option>)}
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400 self-center">{filtered.length} من {profiles.length}</span>
      </div>

      <details className="mb-4 text-sm">
        <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 select-none">
          ⚑ فلترة الموقع المتقدم ▼
        </summary>
        <div className="flex gap-2 mt-2 flex-wrap">
          <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs min-w-[100px]">
            <option value="">⚑ الدولة</option>
            {Object.entries(countries).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="text" placeholder="◈ المحافظة" value={filterGovernorate} onChange={e => setFilterGovernorate(e.target.value)} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs w-[100px]" />
          <input type="text" placeholder="⌖ المدينة" value={filterCity} onChange={e => setFilterCity(e.target.value)} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs w-[100px]" />
          <input type="text" placeholder="⊞ القرية" value={filterVillage} onChange={e => setFilterVillage(e.target.value)} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs w-[100px]" />
          <input type="text" placeholder="▣ الحي" value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs w-[100px]" />
          <input type="text" placeholder="⛩ الشارع" value={filterStreet} onChange={e => setFilterStreet(e.target.value)} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs w-[100px]" />
        </div>
      </details>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">لا يوجد رعاة</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">الرمز</th>
                <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">الاسم</th>
                <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">الدولة</th>
                <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">البريد</th>
                <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(profile => (
                <tr key={profile.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="p-3 font-mono text-xs text-gray-500 dark:text-gray-400">{profile.sponsorCode}</td>
                  <td className="p-3 font-medium text-gray-900 dark:text-white">{profile.companyNameAr}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{countries[profile.countryCode] || profile.countryCode.toUpperCase()}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{profile.email || "—"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[profile.status] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {statusLabels[profile.status] || profile.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-500 dark:text-gray-400">{new Date(profile.createdAt).toLocaleDateString("ar")}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Link href={`/admin/sponsors/${profile.id}`} className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">عرض</Link>
                      <Link href={`/admin/sponsors/${profile.id}/edit`} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">تعديل</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
