"use client";

import { useCallback, useEffect, useState } from "react";
import type { ViewerContext } from "@/src/types/site";

export type UseViewerResult = {
  viewer: ViewerContext;
  loading: boolean;
  refetch: () => void;
  onboardingCompleted: boolean | undefined;
};

export function useViewer(initial: ViewerContext = {
  authenticated: false,
  email: null,
  displayName: "Guest",
  role: "guest",
  countryCode: null,
  permissions: [],
}): UseViewerResult {
  const [viewer, setViewer] = useState<ViewerContext>(initial);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | undefined>(undefined);

  const fetchMe = useCallback(() => {
    setLoading(true);
    void fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: { email?: string | null; name?: string | null; role?: string; permissions?: string[]; onboardingCompleted?: boolean } } | null) => {
        if (data?.user) {
          setViewer({
            authenticated: true,
            email: data.user.email ?? null,
            displayName: data.user.name ?? data.user.email ?? "Guest",
            role: data.user.role ?? "guest",
            countryCode: null,
            permissions: data.user.permissions ?? [],
          });
          setOnboardingCompleted(data.user.onboardingCompleted);
        } else {
          setOnboardingCompleted(undefined);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { cache: "no-store", credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: { email?: string | null; name?: string | null; role?: string; permissions?: string[]; onboardingCompleted?: boolean } } | null) => {
        if (data?.user) {
          setViewer({
            authenticated: true,
            email: data.user.email ?? null,
            displayName: data.user.name ?? data.user.email ?? "Guest",
            role: data.user.role ?? "guest",
            countryCode: null,
            permissions: data.user.permissions ?? [],
          });
          setOnboardingCompleted(data.user.onboardingCompleted);
        } else {
          setOnboardingCompleted(undefined);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return { viewer, loading, refetch: fetchMe, onboardingCompleted };
}