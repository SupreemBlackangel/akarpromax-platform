"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import AuthPageShell, { useAuthPage } from "@/src/components/AuthPageShell";
import Button from "@/src/components/ui/Button";

const VERIFY_OTP_URL = "/api/auth/verify-otp";

export default function VerifyOtpPage() {
  return (
    <AuthPageShell>
      <Suspense>
        <VerifyOtpForm />
      </Suspense>
    </AuthPageShell>
  );
}

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAuthPage();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const purpose = searchParams.get("purpose") ?? "email_change";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(VERIFY_OTP_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(data.error === "too_many_attempts" ? t.error.tooManyAttempts : t.error.invalidCode);
        return;
      }
      setStatus("success");
      const next = searchParams.get("next") ?? "/account/security";
      setTimeout(() => router.push(next), 1500);
    } catch {
      setStatus("error");
      setError(t.error.generic);
    } finally {
      setLoading(false);
    }
  }

  if (status === "success") {
    return (
      <>
        <h1 className="auth-title text-2xl font-bold">{t.verifyOtpTitle}</h1>
        <p className="auth-ok mt-4 text-sm text-[color:var(--color-accent)]">✓ تم التحقق. جارٍ التحويل…</p>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-title text-2xl font-bold">{t.verifyOtpTitle}</h1>
      <p className="auth-subtitle mt-2 text-sm text-[color:var(--color-text-secondary)]">{t.verifyOtpPrompt}</p>
      <form onSubmit={handleSubmit} className="auth-form mt-6 space-y-4">
        <div>
          <label className="auth-label block text-sm font-medium">{t.otpPlaceholder}</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder={t.otpPlaceholder}
            className="auth-input mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-input)] px-[var(--space-3)] py-[var(--space-2)] text-center text-2xl"
            required
          />
        </div>
        <Button type="submit" variant="primary" loading={loading} className="w-full">{t.verifyOtpSubmit}</Button>
        {status === "error" && <p className="auth-error text-sm text-[color:var(--color-danger)]">{error}</p>}
      </form>
    </>
  );
}
