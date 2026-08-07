"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import AuthPageShell, { useAuthPage } from "@/src/components/AuthPageShell";
import Button from "@/src/components/ui/Button";

const RESET_URL = "/api/auth/reset-password";

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <ResetPasswordForm />
    </AuthPageShell>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAuthPage();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = searchParams.get("token") ?? "";
    if (!token) {
      setError(t.error.invalidToken);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(RESET_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, locale: "ar" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error === "invalid_or_expired_token" ? t.error.invalidToken : t.error.generic);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError(t.error.generic);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <>
        <h1 className="auth-title text-2xl font-bold">{t.resetTitle}</h1>
        <p className="auth-ok mt-4 text-sm text-[color:var(--color-accent)]">✓ تم تعيين كلمة المرور. جارٍ تحويلك إلى تسجيل الدخول…</p>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title text-2xl font-bold">{t.resetTitle}</h1>
      <p className="auth-subtitle mt-2 text-sm text-[color:var(--color-text-secondary)]">{t.resetSubtitle}</p>
      <form onSubmit={handleSubmit} className="auth-form mt-6 space-y-4">
        <div>
          <label className="auth-label block text-sm font-medium">{t.resetPasswordLabel}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.resetPasswordPlaceholder} className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-[var(--space-3)] py-[var(--space-2)]" required minLength={8} />
          <p className="auth-hint mt-1 text-xs text-[color:var(--color-text-secondary)]">{t.passwordHint}</p>
        </div>
        <Button type="submit" variant="primary" loading={loading} className="w-full">{t.resetSubmit}</Button>
        {error && <p className="auth-error text-sm text-[color:var(--color-danger)]">{error}</p>}
      </form>
    </>
  );
}
