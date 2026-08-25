"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthPageShell, { useAuthPage } from "@/src/components/AuthPageShell";
import Button from "@/src/components/ui/Button";
import { useViewer } from "@/src/hooks/useViewer";

const CHANGE_PASSWORD_URL = "/api/auth/change-password";
const CHANGE_EMAIL_URL = "/api/auth/change-email";

export default function AccountSecurityPage() {
  return (
    <AuthPageShell>
      <AccountSecurityForm />
    </AuthPageShell>
  );
}

function AccountSecurityForm() {
  const router = useRouter();
  const { t } = useAuthPage();
  const { viewer, loading } = useViewer();

  if (loading) {
    return <p className="auth-wait text-sm text-[color:var(--color-text-secondary)]">جارٍ التحقّق من الجلسة…</p>;
  }
  if (!viewer.authenticated) {
    router.push("/login");
    return null;
  }

  return (
    <>
      <h1 className="auth-title text-2xl font-bold">{t.accountSecurity}</h1>
      <p className="auth-subtitle mt-2 text-sm text-[color:var(--color-text-secondary)]">{t.accountSecuritySubtitle}</p>
      <ChangePasswordForm t={t} />
      <ChangeEmailForm t={t} onStarted={() => {}} />
    </>
  );
}

function ChangePasswordForm({ t }: { t: import("@/lib/auth-labels").AuthLabels }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(CHANGE_PASSWORD_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next, locale: "ar" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(data.error === "wrong_password" ? t.error.wrongPassword : t.error.generic);
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setError(t.error.generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form mt-6 space-y-4">
      <h2 className="text-lg font-semibold">{t.changePasswordTitle}</h2>
      <div>
        <label className="auth-label block text-sm font-medium">{t.currentPasswordLabel}</label>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-[var(--space-3)] py-[var(--space-2)]" required />
      </div>
      <div>
        <label className="auth-label block text-sm font-medium">{t.newPasswordLabel}</label>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-[var(--space-3)] py-[var(--space-2)]" required minLength={8} />
        <p className="auth-hint mt-1 text-xs text-[color:var(--color-text-secondary)]">{t.passwordHint}</p>
      </div>
      <Button type="submit" variant="primary" loading={submitting}>{t.changePasswordSubmit}</Button>
      {status === "success" && <p className="auth-ok text-sm text-[color:var(--color-accent)]">✓ تم تحديث كلمة المرور</p>}
      {status === "error" && <p className="auth-error text-sm text-[color:var(--color-danger)]">{error}</p>}
    </form>
  );
}

function ChangeEmailForm({ t, onStarted }: { t: import("@/lib/auth-labels").AuthLabels; onStarted: () => void }) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(CHANGE_EMAIL_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, locale: "ar" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(data.error === "email_in_use" ? t.error.emailInUse : t.error.generic);
        return;
      }
      setStatus("sent");
      onStarted();
      setTimeout(() => router.push("/verify-otp?purpose=email_change"), 1500);
    } catch {
      setStatus("error");
      setError(t.error.generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form mt-8 space-y-4">
      <h2 className="text-lg font-semibold">{t.changeEmailTitle}</h2>
      <div>
        <label className="auth-label block text-sm font-medium">{t.newEmailLabel}</label>
        <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={t.newEmailPlaceholder} className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-[var(--space-3)] py-[var(--space-2)]" required />
      </div>
      <Button type="submit" variant="primary" loading={submitting}>{t.changeEmailSubmit}</Button>
      {status === "sent" && <p className="auth-ok text-sm text-[color:var(--color-accent)]">✓ أرسلنا رمزاً إلى بريدك الجديد</p>}
      {status === "error" && <p className="auth-error text-sm text-[color:var(--color-danger)]">{error}</p>}
    </form>
  );
}
