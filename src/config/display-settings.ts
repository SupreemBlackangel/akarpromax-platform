/**
 * The public-presentation half of the platform settings, kept free of any
 * server import. `lib/platform-settings.ts` owns storage and re-exports these;
 * client components import from HERE, so the runtime database driver never
 * follows a type into the browser bundle.
 */

export type ThemeMode = "system" | "light" | "dark";
export type ListingLayout = "grid" | "list";
export type UiDensity = "comfortable" | "compact";

/**
 * How the public site presents itself on ONE class of device. The admin edits
 * a desktop set and a mobile set; a pre-paint script in the root layout picks
 * the matching one and stamps it on <html>, so CSS (not prop plumbing) carries
 * the decision to every page.
 */
export type DeviceDisplaySettings = {
  /** Which of the standard public ad bands render on this device. */
  ads: { hero: boolean; side: boolean; bottom: boolean };
  /** Appearance a visitor gets before choosing one of their own. */
  themeMode: ThemeMode;
  /** false pins `themeMode` and hides the appearance control. */
  allowThemeChange: boolean;
  /** Card lists render as a grid of `listingColumns`, or as one column of rows. */
  listingLayout: ListingLayout;
  listingColumns: 1 | 2 | 3 | 4;
  density: UiDensity;
  showSidebar: boolean;
  showNewsTicker: boolean;
  showOfficePromo: boolean;
};

export type DisplaySettings = {
  desktop: DeviceDisplaySettings;
  mobile: DeviceDisplaySettings;
};

/** Below this viewport width the `mobile` set applies. Matches globals.css. */
export const MOBILE_BREAKPOINT_PX = 1024;

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  desktop: {
    ads: { hero: true, side: true, bottom: true },
    themeMode: "system",
    allowThemeChange: true,
    listingLayout: "grid",
    listingColumns: 3,
    density: "comfortable",
    showSidebar: true,
    showNewsTicker: true,
    showOfficePromo: true,
  },
  // The phone default deliberately drops the side rails: a narrow screen has no
  // rail to put them in, and stacking them under the content ends the page on a
  // wall of ad frames.
  mobile: {
    ads: { hero: true, side: false, bottom: true },
    themeMode: "system",
    allowThemeChange: true,
    listingLayout: "grid",
    listingColumns: 1,
    density: "comfortable",
    showSidebar: false,
    showNewsTicker: true,
    showOfficePromo: true,
  },
};
