"use client";

import { useEffect, useState } from "react";

// Minimal typing for the install prompt event (not in the standard lib DOM types).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaManager() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          /* registration is best-effort */
        });
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt as EventListener);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") setVisible(false);
  };

  if (installed || !visible || !deferred) return null;

  return (
    <div className="border-b border-primary/30 bg-primary/10">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-5 py-2 text-xs">
        <span aria-hidden="true" className="text-base">📲</span>
        <span className="font-semibold text-[var(--color-text-primary)]">
          ثبّت «عقار بروماكس» على جهازك (سطح المكتب أو الجوال) للوصول السريع كتطبيق.
        </span>
        <button
          type="button"
          onClick={handleInstall}
          className="ms-auto rounded-lg bg-primary px-3 py-1 font-bold text-white transition-colors hover:bg-primary/90"
        >
          تنصيب التطبيق
        </button>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-lg px-2 py-1 font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          aria-label="إغلاق"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
