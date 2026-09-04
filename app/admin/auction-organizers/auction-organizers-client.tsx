"use client";

import { useCallback, useEffect, useState } from "react";

type GrantRow = {
  id: string;
  organizationId: string;
  organizationNameAr: string | null;
  organizationType: string;
  organizationStatus: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  grantedBy: string;
  grantedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  reason: string | null;
};

type OrgCandidate = {
  id: string;
  nameAr: string | null;
  nameEn: string | null;
  type: string;
  status: string;
  verifiedAt: string | null;
  role: string;
};

export default function AuctionOrganizersClient() {
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [showRevoked, setShowRevoked] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showGrantForm, setShowGrantForm] = useState(false);
  const [orgs, setOrgs] = useState<OrgCandidate[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [granting, setGranting] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<GrantRow | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);

  const fetchGrants = useCallback(async () => {
    setLoading(true);
    try {
      const q = showRevoked ? "?includeRevoked=1" : "";
      const res = await fetch(`/api/admin/auction-organizers${q}`);
      const data = await res.json();
      setGrants(data.success ? data.data : []);
    } catch {
      setGrants([]);
    } finally {
      setLoading(false);
    }
  }, [showRevoked]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGrants();
  }, [fetchGrants]);

  const fetchOrgs = useCallback(async (search: string) => {
    try {
      const res = await fetch(`/api/auctions/organizers`);
      const data = await res.json();
      const rows: OrgCandidate[] = data.success ? data.data : [];
      setOrgs(
        search
          ? rows.filter((o) =>
              (o.nameAr ?? "").includes(search) ||
              (o.nameEn ?? "").toLowerCase().includes(search.toLowerCase()) ||
              o.type.includes(search),
            )
          : rows,
      );
    } catch {
      setOrgs([]);
    }
  }, []);

  const handleGrant = async () => {
    if (!selectedOrgId || !selectedUserId) return;
    setGranting(true);
    try {
      const res = await fetch("/api/admin/auction-organizers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant",
          organizationId: selectedOrgId,
          userId: selectedUserId,
          reason: grantReason || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowGrantForm(false);
        setSelectedOrgId("");
        setSelectedUserId("");
        setGrantReason("");
        setOrgSearch("");
        await fetchGrants();
      }
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const res = await fetch("/api/admin/auction-organizers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke",
          organizationId: revokeTarget.organizationId,
          userId: revokeTarget.userId,
          revokeReason: revokeReason || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRevokeTarget(null);
        setRevokeReason("");
        await fetchGrants();
      }
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--brand-navy]">منحو المزادات المحدودة</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة الجهات (مكاتب عقارية / محاماة) المصرّح لها بإنشاء مزادات محدودة</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showRevoked}
              onChange={(e) => setShowRevoked(e.target.checked)}
              className="w-4 h-4 accent-[color:var(--color-primary)]"
            />
            عرض الملغاة
          </label>
          <button
            onClick={() => {
              setShowGrantForm(true);
              fetchOrgs(orgSearch);
            }}
            className="px-4 py-2 rounded-lg text-white font-semibold text-sm"
            style={{ background: 'var(--brand-gradient)' }}
          >
            + منح صلاحية
          </button>
        </div>
      </div>

      {/* Grant Form */}
      {showGrantForm && (
        <div className="bg-[var(--color-surface)] rounded-xl border p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[--brand-navy]">منح صلاحية جديدة</h2>
            <button onClick={() => setShowGrantForm(false)} className="text-gray-400 hover:text-red-500 text-xl">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">المنظمة</label>
              <input
                value={orgSearch}
                onChange={(e) => {
                  setOrgSearch(e.target.value);
                  fetchOrgs(e.target.value);
                }}
                placeholder="بحث بالاسم أو النوع..."
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              {orgs.length > 0 && (
                <div className="max-h-48 overflow-y-auto border rounded-lg mt-1 bg-[var(--color-surface)] shadow-sm">
                  {orgs.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => {
                        setSelectedOrgId(o.id);
                        setOrgSearch(o.nameAr ?? o.nameEn ?? o.id);
                        setOrgs([]);
                      }}
                      className="w-full text-right px-3 py-2 hover:bg-[var(--color-primary-soft)] text-sm border-b last:border-0"
                    >
                      <span className="font-semibold">{o.nameAr ?? o.nameEn}</span>
                      <span className="text-gray-400 mr-2">({o.type})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">رقم المستخدم (userId)</label>
              <input
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                placeholder="UUID"
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">السبب</label>
              <input
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                placeholder="اختياري"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleGrant}
              disabled={!selectedOrgId || !selectedUserId || granting}
              className="px-5 py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-50"
              style={{ background: 'var(--brand-gradient)' }}
            >
              {granting ? "جاري..." : "منح"}
            </button>
          </div>
        </div>
      )}

      {/* Revoke Confirmation */}
      {revokeTarget && (
        <div className="bg-[var(--color-surface)] rounded-xl border p-5 space-y-4 shadow-sm border-[var(--color-error)]/30">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-red-600">إلغاء صلاحية</h2>
            <button onClick={() => setRevokeTarget(null)} className="text-gray-400 hover:text-red-500 text-xl">✕</button>
          </div>
          <p className="text-sm">
            هل أنت متأكد من إلغاء صلاحية <strong>{revokeTarget.userName ?? revokeTarget.userEmail}</strong> من منظمة <strong>{revokeTarget.organizationNameAr}</strong>؟
          </p>
          <input
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder="سبب الإلغاء (اختياري)"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setRevokeTarget(null)} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">
              إلغاء
            </button>
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="px-5 py-2 rounded-lg text-white font-semibold text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {revoking ? "جاري..." : "تأكيد الإلغاء"}
            </button>
          </div>
        </div>
      )}

      {/* Grants List */}
      <div className="bg-[var(--color-surface)] rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-right">
              <th className="px-4 py-3 font-semibold">المنظمة</th>
              <th className="px-4 py-3 font-semibold">المستخدم</th>
              <th className="px-4 py-3 font-semibold">السبب</th>
              <th className="px-4 py-3 font-semibold">المنحة</th>
              <th className="px-4 py-3 font-semibold">الحالة</th>
              <th className="px-4 py-3 font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">جاري التحميل...</td>
              </tr>
            ) : grants.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">لا توجد منح {showRevoked ? "" : "نشطة"}</td>
              </tr>
            ) : (
              grants.map((g) => (
                <tr key={g.id} className={`border-b last:border-0 ${g.revokedAt ? "bg-[var(--color-error-soft)]/50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{g.organizationNameAr ?? "—"}</div>
                    <div className="text-xs text-gray-400">{g.organizationType}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{g.userName ?? "—"}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[140px]">{g.userEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{g.reason ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    <div>{g.grantedAt ? new Date(g.grantedAt).toLocaleDateString("ar-EG") : "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {g.revokedAt ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-[var(--color-error)]">
                        ملغاة
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        نشطة
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!g.revokedAt && (
                      <button
                        onClick={() => {
                          setRevokeTarget(g);
                          setRevokeReason("");
                        }}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        إلغاء الصلاحية
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
