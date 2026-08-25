"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthPageShell, { useAuthPage } from "@/src/components/AuthPageShell";
import Button from "@/src/components/ui/Button";
import { useViewer } from "@/src/hooks/useViewer";

const ONBOARD_URL = "/api/auth/onboarding/complete";

export default function OnboardingPage() {
  return (
    <AuthPageShell>
      <OnboardingForm />
    </AuthPageShell>
  );
}

function OnboardingForm() {
  const router = useRouter();
  const { t } = useAuthPage();
  const { viewer, loading, onboardingCompleted } = useViewer();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return <p className="auth-wait text-sm text-[color:var(--color-text-secondary)]">جارٍ التحقّق من الجلسة…</p>;
  }
  if (!viewer.authenticated) {
    router.push("/login");
    return null;
  }
  if (onboardingCompleted) {
    router.push("/");
    return null;
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(ONBOARD_URL, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t.error.generic);
        return;
      }
      router.push("/");
    } catch {
      setError(t.error.generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="auth-title text-2xl font-bold">{t.onboardingTitle}</h1>
      <p className="auth-subtitle mt-2 text-sm text-[color:var(--color-text-secondary)]">{t.onboardingSubtitle}</p>
      <form onSubmit={handleComplete} className="auth-form mt-6">
        <Button type="submit" variant="primary" loading={submitting} className="w-full">{t.onboardingComplete}</Button>
        {error && <p className="auth-error mt-2 text-sm text-[color:var(--color-danger)]">{error}</p>}
      </form>
    </>
  );
}
