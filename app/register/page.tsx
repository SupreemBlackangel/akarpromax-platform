"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthPageShell, { useAuthPage } from "@/src/components/AuthPageShell";
import Button from "@/src/components/ui/Button";

const REGISTER_URL = "/api/auth/register";

export default function RegisterPage() {
  return (
    <AuthPageShell>
      <RegisterForm />
    </AuthPageShell>
  );
}

function RegisterForm() {
  const router = useRouter();
  const { t } = useAuthPage();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(REGISTER_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone: phone || undefined, name, password, preferredLanguage: "ar" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error === "already_registered" ? t.error.emailInUse : t.error.generic);
        return;
      }
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError(t.error.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="auth-title text-2xl font-bold">{t.registerTitle}</h1>
      <p className="auth-subtitle mt-2 text-sm text-[color:var(--color-text-secondary)]">{t.registerSubtitle}</p>
      <form onSubmit={handleSubmit} className="auth-form mt-6 space-y-4">
        <div>
          <label className="auth-label block text-sm font-medium">{t.emailLabel}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-[var(--space-3)] py-[var(--space-2)]" required />
        </div>
        <div>
          <label className="auth-label block text-sm font-medium">{t.phoneLabel}</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePlaceholder} className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-[var(--space-3)] py-[var(--space-2)]" />
        </div>
        <div>
          <label className="auth-label block text-sm font-medium">{t.nameLabel}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-[var(--space-3)] py-[var(--space-2)]" />
        </div>
        <div>
          <label className="auth-label block text-sm font-medium">{t.passwordLabel}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-[var(--space-3)] py-[var(--space-2)]" required minLength={8} />
          <p className="auth-hint mt-1 text-xs text-[color:var(--color-text-secondary)]">{t.passwordHint}</p>
        </div>
        <Button type="submit" variant="primary" loading={loading} className="w-full">{t.registerSubmit}</Button>
        {error && <p className="auth-error text-sm text-[color:var(--color-danger)]">{error}</p>}
      </form>
      <p className="auth-foot mt-6 text-center text-sm">{t.registerHasAccount}{" "}<button type="button" className="auth-link text-[color:var(--color-primary)]" onClick={() => router.push("/login")}>{t.registerToLogin}</button></p>
    </>
  );
}
