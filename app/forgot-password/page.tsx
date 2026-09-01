"use client";

import { useState } from "react";
import AuthPageShell, { useAuthPage } from "@/src/components/AuthPageShell";
import Button from "@/src/components/ui/Button";

const FORGOT_URL = "/api/auth/forgot-password";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}

function ForgotPasswordForm() {
  const { t } = useAuthPage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(FORGOT_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale: "ar" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t.error.generic);
        return;
      }
      setSent(true);
    } catch {
      setError(t.error.generic);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <>
        <h1 className="auth-title text-2xl font-bold">{t.forgotTitle}</h1>
        <p className="auth-subtitle mt-2 text-sm text-[color:var(--color-text-secondary)]">{t.forgotSent}</p>
        <Button variant="ghost" className="mt-4" onClick={() => location.href = "/login"}>{t.login}</Button>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title text-2xl font-bold">{t.forgotTitle}</h1>
      <p className="auth-subtitle mt-2 text-sm text-[color:var(--color-text-secondary)]">{t.forgotSubtitle}</p>
      <form onSubmit={handleSubmit} className="auth-form mt-6 space-y-4">
        <div>
          <label className="auth-label block text-sm font-medium">{t.emailLabel}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-input)] px-[var(--space-3)] py-[var(--space-2)]" required />
        </div>
        <Button type="submit" variant="primary" loading={loading} className="w-full">{t.forgotSubmit}</Button>
        {error && <p className="auth-error text-sm text-[color:var(--color-danger)]">{error}</p>}
      </form>
    </>
  );
}
