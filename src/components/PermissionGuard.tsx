"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type GuardState = "loading" | "unauthenticated" | "forbidden" | "granted";

type PermissionGuardProps = {
  requiredPermissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function PermissionGuard({ requiredPermissions, children, fallback }: PermissionGuardProps) {
  const [state, setState] = useState<GuardState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user-context", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { authenticated: boolean; permissions: string[]; role: string }) => {
        if (cancelled) return;
        if (!data.authenticated) {
          setState("unauthenticated");
          return;
        }
        const hasAll = requiredPermissions.length === 0 ||
          requiredPermissions.every((p) => data.permissions.includes(p));
        setState(hasAll ? "granted" : "forbidden");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "فشل التحقق من الصلاحية");
        setState("forbidden");
      });
    return () => { cancelled = true; };
  }, [requiredPermissions]);

  if (state === "loading") {
    return (
      <div className="permission-loading" dir="rtl" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>⏳</div>
          <p style={{ opacity: 0.6 }}>جارٍ التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (state === "unauthenticated") {
    return (
      <div className="permission-error" dir="rtl" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🔒</div>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>تسجيل الدخول مطلوب</h1>
          <p style={{ opacity: 0.6, marginBottom: 20 }}>يجب تسجيل الدخول أولاً للوصول إلى هذه الصفحة.</p>
          <Link href="/" style={{ textDecoration: "underline", opacity: 0.7 }}>العودة إلى المنصة</Link>
        </div>
      </div>
    );
  }

  if (state === "forbidden") {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="permission-error" dir="rtl" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>⚠️</div>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>403 — ليس لديك صلاحية للوصول إلى هذه الصفحة</h1>
          <p style={{ opacity: 0.6, marginBottom: 8 }}>{error || "حسابك مسجل لكن لا يملك الصلاحية المطلوبة."}</p>
          <p style={{ opacity: 0.4, fontSize: 13, marginBottom: 20 }}>اطلب من المدير العام منحك الصلاحية المناسبة.</p>
          <Link href="/" style={{ textDecoration: "underline", opacity: 0.7 }}>العودة إلى المنصة</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
