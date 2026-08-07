"use client";

/**
 * Central ad placement policy for /tools pages.
 *
 * RULE: On mobile, the primary tool interaction zone (title → input → action → result)
 * must remain free of advertisements. Ads may only appear AFTER the result/output.
 *
 * Desktop allows contextual side placements if they don't interrupt the task.
 */

export type ToolType = "calculator" | "converter" | "file_tool" | "map_tool" | "utility";

type AdPlacement = {
  id: string;
  mobile: boolean;
  desktop: boolean;
  position: "before_result" | "after_result" | "sidebar" | "below_help";
};

const DEFAULT_PLACEMENTS: Record<string, AdPlacement> = {
  TOOL_AFTER_RESULT: {
    id: "tool_after_result",
    mobile: true,
    desktop: true,
    position: "after_result",
  },
  TOOL_DESKTOP_SIDE: {
    id: "tool_desktop_side",
    mobile: false,
    desktop: true,
    position: "sidebar",
  },
  TOOL_BELOW_HELP: {
    id: "tool_below_help",
    mobile: true,
    desktop: true,
    position: "below_help",
  },
};

const BLOCKED_MOBILE_PLACEMENTS = [
  "tools_hero",
  "tool_inline",
  "tool_before_result",
  "tool_sticky",
];

export function getToolAdPlacements(toolType: ToolType): AdPlacement[] {
  switch (toolType) {
    case "calculator":
    case "converter":
      return [DEFAULT_PLACEMENTS.TOOL_AFTER_RESULT, DEFAULT_PLACEMENTS.TOOL_DESKTOP_SIDE];
    case "file_tool":
      return [DEFAULT_PLACEMENTS.TOOL_AFTER_RESULT, DEFAULT_PLACEMENTS.TOOL_BELOW_HELP];
    case "map_tool":
      return [DEFAULT_PLACEMENTS.TOOL_AFTER_RESULT];
    case "utility":
      return [DEFAULT_PLACEMENTS.TOOL_AFTER_RESULT, DEFAULT_PLACEMENTS.TOOL_DESKTOP_SIDE];
  }
}

export function shouldRenderAd(placement: AdPlacement, isMobile: boolean): boolean {
  if (isMobile && !placement.mobile) return false;
  if (!isMobile && !placement.desktop) return false;
  return true;
}

export function isAdBlocked(placementId: string): boolean {
  return BLOCKED_MOBILE_PLACEMENTS.includes(placementId);
}
