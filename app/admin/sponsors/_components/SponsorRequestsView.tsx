"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SponsorProfile } from "@/src/types/sponsor";

const statusLabels: Record<string, string> = {
  draft: "مسودة", pending: "قيد الانتظار", under_review: "قيد المراجعة",
  approved: "معتمد", active: "نشط", suspended: "موقوف",
  expired: "منتهي", rejected: "مرفوض", archived: "مؤرشف",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  under_review: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const countries: Record<string, string> = {
  om: "عُمان", sa: "السعودية", ae: "الإمارات", qa: "قطر",
  kw: "الكويت", bh: "البحرين", eg: "مصر", jo: "الأردن",
};

export default function SponsorRequestsView() {
  const [profiles, setProfiles] = useState<SponsorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function fetchRequests() {
    setLoading(true);
    fetch("/api/sponsor-profiles?status=pending")
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setProfiles(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => { window.queueMicrotask(() => fetchRequests()); }, []);

  async function updateStatus(id: string, status: string) {
    setActionLoading(id);
    try {
      await fetch("/api/sponsor-profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">طلبات اعتماد الرعاة</h1>

      {profiles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-lg">لا توجد طلبات اعتماد حالياً</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">جميع طلبات الرعاة تمت معالجتها</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/admin/sponsors/${profile.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                    {profile.companyNameAr}
                  </Link>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[profile.status]}`}>
                    {statusLabels[profile.status] || profile.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-3">
                  <span>{countries[profile.countryCode] || profile.countryCode.toUpperCase()}</span>
                  {profile.email && <span>{profile.email}</span>}
                  {profile.phone && <span>{profile.phone}</span>}
                </div>
              </div>
              <div className="flex gap-2 mr-4">
                <button
                  onClick={() => updateStatus(profile.id, "approved")}
                  disabled={actionLoading === profile.id}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs transition-colors"
                >
                  اعتماد
                </button>
                <button
                  onClick={() => updateStatus(profile.id, "rejected")}
                  disabled={actionLoading === profile.id}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs transition-colors"
                >
                  رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
