"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_DISPLAY_SETTINGS, MOBILE_BREAKPOINT_PX, type DeviceDisplaySettings, type DisplaySettings } from "@/src/config/display-settings";

/**
 * The admin-chosen presentation for the current device.
 *
 * The pre-paint script in app/layout.tsx already stamped the same decision on
 * <html> as data-* attributes, and globals.css does the hiding and the layout
 * work from there. This context exists for the handful of places that need the
 * values in JavaScript rather than in CSS — chiefly the appearance control,
 * which must know whether visitors may change the theme at all.
 */
type DisplaySettingsValue = {
  device: "desktop" | "mobile";
  settings: DeviceDisplaySettings;
  all: DisplaySettings;
};

const FALLBACK: DisplaySettingsValue = {
  device: "desktop",
  settings: DEFAULT_DISPLAY_SETTINGS.desktop,
  all: DEFAULT_DISPLAY_SETTINGS,
};

const DisplaySettingsContext = createContext<DisplaySettingsValue>(FALLBACK);

export function useDisplaySettings(): DisplaySettingsValue {
  return useContext(DisplaySettingsContext);
}

export function DisplaySettingsProvider({ value, children }: { value: DisplaySettings; children: ReactNode }) {
  // Starts on "desktop" so the first client render matches the server's; the
  // effect corrects it after mount. CSS carries the pre-paint version, so the
  // visitor never sees the desktop presentation on a phone.
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const apply = () => setDevice(media.matches ? "mobile" : "desktop");
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return (
    <DisplaySettingsContext.Provider value={{ device, settings: value[device], all: value }}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}
