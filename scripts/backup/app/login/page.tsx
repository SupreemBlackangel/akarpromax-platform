"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthPageShell, { useAuthPage } from "@/src/components/AuthPageShell";
import Button from "@/src/components/ui/Button";

const LOGIN_URL = "/api/auth/login";

export default function LoginPage() {
  return (
    <AuthPageShell>
      <LoginForm />
    </AuthPageShell>
  );
}

function LoginForm() {
  const router = useRouter();
  const { t } = useAuthPage();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error === "account_blocked" ? t.error.mustVerify : t.error.invalidCredentials);
        return;
      }
      const user = data.user ?? {};
      if (user.onboardingCompleted === false) router.push("/onboarding");
      else router.push("/");
    } catch {
      setError(t.error.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="auth-title text-2xl font-bold">{t.loginTitle}</h1>
      <p className="auth-subtitle mt-2 text-sm text-[color:var(--color-text-secondary)]">{t.loginSubtitle}</p>
      <form onSubmit={handleSubmit} className="auth-form mt-6 space-y-4">
        <div>
          <label className="auth-label block text-sm font-medium">{t.emailLabel}</label>
          <input
            type="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={t.emailPlaceholder}
            className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-[var(--space-3)] py-[var(--space-2)]"
            required
          />
        </div>
        <div>
          <label className="auth-label block text-sm font-medium">{t.passwordLabel}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.passwordPlaceholder}
            className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-[var(--space-3)] py-[var(--space-2)]"
            required
            minLength={8}
          />
          <p className="auth-hint mt-1 text-xs text-[color:var(--color-text-secondary)]">{t.passwordHint}</p>
        </div>
        <Button type="submit" variant="primary" loading={loading} className="w-full">{t.loginSubmit}</Button>
        {error && <p className="auth-error text-sm text-[color:var(--color-danger)]">{error}</p>}
      </form>
      <p className="auth-foot mt-6 text-center text-sm">{t.loginNoAccount}{" "}<button type="button" className="auth-link text-[color:var(--color-primary)]" onClick={() => router.push("/register")}>{t.loginToRegister}</button></p>
      <p className="auth-forgot mt-2 text-center text-sm"><button type="button" className="auth-link text-[color:var(--color-primary)]" onClick={() => router.push("/forgot-password")}>{t.forgotPassword}</button></p>
    </>
  );
}
