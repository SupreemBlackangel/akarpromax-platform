"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Which empty ad frame — if any — is allowed to say "advertise here".
 *
 * A page carries eight standard placements. On a page nobody has bought yet,
 * every one of them used to draw a dashed grey box labelled "مساحة إعلانية",
 * so a visitor's first impression of a section was seven empty rectangles
 * announcing that the platform has not sold anything. An empty shelf does not
 * sell a shop.
 *
 * The policy the product settled on has three states, and only the middle one
 * is visible to a visitor:
 *
 *   sold      — a campaign is running: the ad is drawn, and this is untouched.
 *   for sale  — nobody bought it: ONE frame on the page invites, the rest
 *               draw nothing at all and their column collapses.
 *   reserved  — held back: drawn for nobody, including the invitation.
 *
 * The claim is first-come, and first on the page in DOM order is the first to
 * render, so the invitation lands in the highest frame that is actually empty.
 * A frame that later fills releases its claim, and the next empty one takes it.
 *
 * Review mode (?adreview=1) is outside this entirely: whoever is auditing
 * placements needs to see all eight, labelled.
 */

type AdInviteContextValue = {
  /** True when this key holds the page's one invitation. */
  claim: (key: string) => boolean;
  release: (key: string) => void;
};

const AdInviteContext = createContext<AdInviteContextValue | null>(null);

export function AdInviteProvider({ children }: { children: ReactNode }) {
  // The holder is state (the frames re-render when it changes) and a ref (a
  // claim made during render must be visible to the next frame claiming in the
  // same pass, before React has committed anything).
  const [holder, setHolder] = useState<string | null>(null);
  const holderRef = useRef<string | null>(null);

  const claim = useCallback((key: string) => {
    if (holderRef.current === null) {
      holderRef.current = key;
      setHolder(key);
      return true;
    }
    return holderRef.current === key;
  }, []);

  const release = useCallback((key: string) => {
    if (holderRef.current !== key) return;
    holderRef.current = null;
    setHolder(null);
  }, []);

  const value = useMemo(() => ({ claim, release }), [claim, release]);
  // `holder` is read so the provider re-renders its subtree when the claim
  // moves; the frames themselves decide what that means for them.
  void holder;

  return <AdInviteContext.Provider value={value}>{children}</AdInviteContext.Provider>;
}

/**
 * Ask for the page's one invitation.
 *
 * Outside a provider — a frame rendered on its own, or a page that has not
 * adopted the standard layout — nothing invites, because "one per page" cannot
 * be honoured without somebody counting.
 */
export function useAdInvite(): AdInviteContextValue {
  return (
    useContext(AdInviteContext) ?? {
      claim: () => false,
      release: () => undefined,
    }
  );
}
