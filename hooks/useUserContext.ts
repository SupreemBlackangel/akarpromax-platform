"use client";

import { useState, useEffect } from "react";

export type UserContext = {
  authenticated: boolean;
  email: string | null;
  displayName: string;
  role: string;
  countryCode: string | null;
  permissions: string[];
};

const GUEST: UserContext = {
  authenticated: false,
  email: null,
  displayName: "Guest",
  role: "guest",
  countryCode: null,
  permissions: [],
};

export function useUserContext() {
  const [user, setUser] = useState<UserContext>(GUEST);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user-context", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("HTTP " + res.status))))
      .then((data: UserContext) => setUser(data))
      .catch(() => setUser(GUEST))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
