"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthPageShell, { useAuthPage } from "@/src/components/AuthPageShell";
import Button from "@/src/components/ui/Button";
import { useViewer } from "@/src/hooks/useViewer";
import { roleNameAr } from "@/src/constants/roles";

type MeUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
  status: string;
  emailVerified: boolean | null;
  isActive: boolean;
  onboardingCompleted: boolean;
  preferredLanguage: string | null;
  createdAt: string | null;
  permissions: string[];
};

export default function AccountProfilePage() {
  return (
    <AuthPageShell>
      <AccountProfileForm />
    </AuthPageShell>
  );
}

function AccountProfileForm() {
  const router = useRouter();
  const { t } = useAuthPage();
  const { viewer, loading } = useViewer();
  const [me, setMe] = useState<MeUser | null>(null);

  useEffect(() => {
    if (!viewer.authenticated) return;
    const controller = new AbortController();
    fetch("/api/auth/me", { cache: "no-store", credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: MeUser } | null) => {
        if (!controller.signal.aborted) setMe(data?.user ?? null);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [viewer.authenticated]);

  if (loading) {
    return <p className="auth-wait text-sm text-[color:var(--color-text-secondary)]">جارٍ التحقّق من الجلسة…</p>;
  }
  if (!viewer.authenticated) {
    router.push("/login");
    return null;
  }

  const roleLabel = roleNameAr(me?.role ?? viewer.role);
  const isProvider = (me?.role ?? viewer.role) === "service_provider";

  return (
    <>
      <h1 className="auth-title text-2xl font-bold">{t.accountTitle}</h1>
      <p className="auth-subtitle mt-2 text-sm text-[color:var(--color-text-secondary)]">{t.accountDescription}</p>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-accent-soft)] text-2xl font-black text-[color:var(--color-accent)]">
          {(me?.name ?? viewer.displayName).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-[color:var(--color-text)]">{me?.name ?? viewer.displayName}</p>
          <p className="text-sm text-[color:var(--color-text-secondary)]">{me?.email ?? viewer.email}</p>
          <span className="mt-1 inline-block rounded-full bg-[color:var(--color-accent-soft)] px-3 py-0.5 text-xs font-bold text-[color:var(--color-accent)]">
            {roleLabel}
          </span>
        </div>
      </div>

      <dl className="mt-6 space-y-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-input)] p-[var(--space-4)] text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[color:var(--color-text-secondary)]">{t.emailLabel ?? "البريد الإلكتروني"}</dt>
          <dd className="font-semibold text-[color:var(--color-text)]" dir="ltr">{me?.email ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[color:var(--color-text-secondary)]">{t.phoneLabel ?? "رقم الهاتف"}</dt>
          <dd className="font-semibold text-[color:var(--color-text)]" dir="ltr">{me?.phone ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[color:var(--color-text-secondary)]">{t.emailVerification ?? "توثيق البريد"}</dt>
          <dd className="font-semibold text-[color:var(--color-text)]">
            {me?.emailVerified ? "✓ مؤكّد" : me?.emailVerified === false ? "غير مؤكّد" : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[color:var(--color-text-secondary)]">{t.registerDate ?? "تاريخ التسجيل"}</dt>
          <dd className="font-semibold text-[color:var(--color-text)]">
            {me?.createdAt ? new Date(me.createdAt).toLocaleDateString("ar") : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-6 space-y-3">
        <Link href="/dashboard" className="block">
          <Button variant="primary" className="w-full">{t.dashboardTitle ?? "لوحة التحكم"}</Button>
        </Link>
        {isProvider && (
          <Link href="/dashboard/services/provider-profile" className="block">
            <Button variant="secondary" className="w-full">{t.providerTitle ?? "الملف المهني"}</Button>
          </Link>
        )}
        <Link href="/account/security" className="block">
          <Button variant="secondary" className="w-full">{t.accountSecurityTitle ?? "الأمان"}</Button>
        </Link>
      </div>
    </>
  );
}
