"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AuthPageShell, { useAuthPage } from "@/src/components/AuthPageShell";
import Button from "@/src/components/ui/Button";

const VERIFY_URL = "/api/auth/verify-email";
const RESEND_URL = "/api/auth/verify-email/resend";

export default function VerifyEmailPage() {
  return (
    <AuthPageShell>
      <VerifyEmailForm />
    </AuthPageShell>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAuthPage();
  const [token] = useState<string | null>(() => searchParams.get("token"));
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [pastedToken, setPastedToken] = useState("");
  const initialStatus = token ? "loading" : "idle";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(initialStatus);
  const [message, setMessage] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch(VERIFY_URL, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { error?: string } | null) => {
        if (data?.error) {
          setStatus("error");
          setMessage(data.error === "invalid_or_expired_token" ? t.error.invalidToken : t.error.generic);
          return;
        }
        setStatus("success");
        setMessage("");
        setTimeout(() => router.push("/login"), 2000);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
        setMessage(t.error.generic);
      });
    return () => controller.abort();
  }, [token, router, t]);

  const verifyToken = useCallback(async (tok: string) => {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch(VERIFY_URL, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tok }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error === "invalid_or_expired_token" ? t.error.invalidToken : t.error.generic);
        return;
      }
      setStatus("success");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setStatus("error");
      setMessage(t.error.generic);
    }
  }, [router, t]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendStatus("loading");
    setMessage("");
    try {
      const res = await fetch(RESEND_URL, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, locale: "ar" }) });
      const data = await res.json().catch(() => ({}));
      setResendStatus(res.ok ? "sent" : "error");
      setMessage(res.ok ? "تم إرسال رابط جديد إلى بريدك." : data.error || t.error.generic);
    } catch {
      setResendStatus("error");
      setMessage(t.error.generic);
    }
  }

  async function handlePaste(e: React.FormEvent) {
    e.preventDefault();
    const tok = pastedToken.trim();
    if (tok) void verifyToken(tok);
  }

  if (status === "loading") {
    return (
      <>
        <h1 className="auth-title text-2xl font-bold">{t.verifyEmailTitle}</h1>
        <p className="auth-subtitle mt-2 text-sm text-[color:var(--color-text-secondary)]">{t.verifyEmailSubtitle}</p>
        <p className="auth-wait mt-6 text-sm text-[color:var(--color-text-secondary)]">جارٍ تفعيل حسابك…</p>
      </>
    );
  }

  if (status === "success") {
    return (
      <>
        <h1 className="auth-title text-2xl font-bold">{t.verifyEmailTitle}</h1>
        <p className="auth-ok mt-2 text-sm text-[color:var(--color-accent)]">✓ {t.verifyEmailTitle} مكتملة. سيتم تحويلك إلى صفحة تسجيل الدخول…</p>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title text-2xl font-bold">{t.verifyEmailTitle}</h1>
      <p className="auth-subtitle mt-2 text-sm text-[color:var(--color-text-secondary)]">{t.verifyEmailNote}</p>
      {status === "error" && message && <p className="auth-error mt-4 text-sm text-[color:var(--color-danger)]">{message}</p>}

      <form onSubmit={handlePaste} className="auth-form mt-6 space-y-4">
        <div>
          <label className="auth-label block text-sm font-medium">الصق الرمز من البريد</label>
          <input type="text" value={pastedToken} onChange={(e) => setPastedToken(e.target.value)} placeholder="الرمز" className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-[var(--space-3)] py-[var(--space-2)]" />
        </div>
        <Button type="submit" variant="primary" className="w-full">{t.verifyOtpSubmit}</Button>
      </form>

      <form onSubmit={handleResend} className="auth-resend mt-6 space-y-3">
        <div>
          <label className="auth-label block text-sm font-medium">{t.emailLabel}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-[var(--space-3)] py-[var(--space-2)]" />
        </div>
        <Button type="submit" variant="ghost" loading={resendStatus === "loading"}>{t.verifyEmailResend}</Button>
      </form>
    </>
  );
}
