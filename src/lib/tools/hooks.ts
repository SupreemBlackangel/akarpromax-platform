"use client";

import { useCallback, useState } from "react";
import type { UnitSystem } from "@/src/lib/tools/engineering";

export function usePersistedState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const saved = localStorage.getItem(`tool_${key}`);
      return saved ? JSON.parse(saved) : initial;
    } catch { return initial; }
  });

  const set = useCallback((v: T) => {
    setValue(v);
    try { localStorage.setItem(`tool_${key}`, JSON.stringify(v)); } catch {}
  }, [key]);

  return [value, set];
}

export function useUnitSystem(): [UnitSystem, (u: UnitSystem) => void] {
  const [unit, setUnit] = useState<UnitSystem>(() => {
    if (typeof window === "undefined") return "metric";
    return (localStorage.getItem("tool_unit") as UnitSystem) ?? "metric";
  });

  const set = useCallback((u: UnitSystem) => {
    setUnit(u);
    try { localStorage.setItem("tool_unit", u); } catch {}
  }, []);

  return [unit, set];
}

export function useUrlShare(params: Record<string, string | number>) {
  const share = useCallback(() => {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(params)) {
      if (v !== "" && v !== undefined && v !== null) url.searchParams.set(k, String(v));
      else url.searchParams.delete(k);
    }
    navigator.clipboard.writeText(url.toString());
  }, [params]);
  return share;
}

export function readUrlParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  params.forEach((v, k) => { result[k] = v; });
  return result;
}
