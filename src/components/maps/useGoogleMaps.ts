"use client";

import { useEffect, useState } from "react";

/**
 * Loading the Google Maps JavaScript API, once per page.
 *
 * Two things have to happen before a map can draw: the key has to be fetched
 * from /api/maps/config (it lives in the server's environment, not in the
 * bundle — see that route for why), and the API script has to be injected.
 * Both are memoised at module scope, so ten maps on one page cause one fetch
 * and one <script>. Loading the API twice logs a console error and can leave
 * two conflicting `google.maps` namespaces, so the promise is the guard.
 */

export type MapsConfig = { provider: "google" | "osm"; googleMapsApiKey: string | null };

export type MapsState =
  | { status: "loading" }
  /** No key configured, or the API refused to load — the caller falls back to OpenStreetMap. */
  | { status: "unavailable" }
  | { status: "ready" };

let configPromise: Promise<MapsConfig> | null = null;
let scriptPromise: Promise<boolean> | null = null;

async function loadConfig(): Promise<MapsConfig> {
  configPromise ??= fetch("/api/maps/config", { cache: "no-store" })
    .then((response) => (response.ok ? (response.json() as Promise<MapsConfig>) : { provider: "osm" as const, googleMapsApiKey: null }))
    .catch(() => ({ provider: "osm" as const, googleMapsApiKey: null }));
  return configPromise;
}

function injectScript(key: string): Promise<boolean> {
  scriptPromise ??= new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") { resolve(false); return; }
    if ((window as { google?: { maps?: unknown } }).google?.maps) { resolve(true); return; }
    const script = document.createElement("script");
    // `loading=async` is what Google asks for when the script is injected
    // rather than written into the document; language=ar keeps the labels and
    // the controls Arabic, which is the whole point of the swap.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=ar&loading=async`;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Whether Google Maps is usable right now. Never throws; falls back to "unavailable". */
export function useGoogleMaps(): MapsState {
  const [state, setState] = useState<MapsState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const config = await loadConfig();
      if (!alive) return;
      if (config.provider !== "google" || !config.googleMapsApiKey) { setState({ status: "unavailable" }); return; }
      const loaded = await injectScript(config.googleMapsApiKey);
      if (!alive) return;
      setState(loaded ? { status: "ready" } : { status: "unavailable" });
    })();
    return () => { alive = false; };
  }, []);

  return state;
}

/** Test seam: forget the memoised config and script promises. */
export function resetGoogleMapsForTesting(): void {
  configPromise = null;
  scriptPromise = null;
}
