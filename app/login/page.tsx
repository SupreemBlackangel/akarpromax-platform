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
  const [oauthError] = useState(() => {
    if (typeof window === "undefined") return "";
    const err = new URLSearchParams(window.location.search).get("error");
    if (err === "google_config_missing" || err === "facebook_config_missing") {
      return "تعذّر تسجيل الدخول عبر الحساب الاجتماعي: إعدادات المزوّد غير مكتملة. يرجى استخدام البريد وكلمة المرور.";
    }
    if (err) {
      return "تعذّر إتمام تسجيل الدخول عبر الحساب الاجتماعي. حاول مرة أخرى أو استخدم البريد وكلمة المرور.";
    }
    return "";
  });

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
      {oauthError && (
        <p className="auth-error mb-4 rounded-[var(--radius-md)] border border-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 px-3 py-2 text-sm text-[color:var(--color-danger)]">
          {oauthError}
        </p>
      )}
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

      {/* Social Login Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[color:var(--color-border-strong)]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[color:var(--color-surface)] px-3 text-[color:var(--color-text-secondary)]">أو</span>
        </div>
      </div>

      {/* Social Login Buttons */}
      <div className="space-y-3">
        <a
          href="/api/auth/google"
          className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          المتابعة عبر Google
        </a>
        <a
          href="/api/auth/facebook"
          className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[#1877F2] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#166FE5]"
        >
          <svg className="h-5 w-5" fill="white" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          المتابعة عبر Facebook
        </a>
      </div>
      <p className="auth-foot mt-6 text-center text-sm">{t.loginNoAccount}{" "}<button type="button" className="auth-link text-[color:var(--color-primary)]" onClick={() => router.push("/register")}>{t.loginToRegister}</button></p>
      <p className="auth-forgot mt-2 text-center text-sm"><button type="button" className="auth-link text-[color:var(--color-primary)]" onClick={() => router.push("/forgot-password")}>{t.forgotPassword}</button></p>
    </>
  );
}
