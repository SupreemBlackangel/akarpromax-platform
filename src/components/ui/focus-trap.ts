const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

export function clampFocusIndex(index: number, count: number, shiftKey: boolean): number {
  if (count <= 0) return -1;
  if (count === 1) return 0;
  if (shiftKey) return (index - 1 + count) % count;
  return (index + 1) % count;
}

export function trapFocusKeydown(event: KeyboardEvent, container: HTMLElement): void {
  if (event.key !== "Tab") return;
  const focusables = getFocusableElements(container);
  if (focusables.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }
  const index = focusables.indexOf(document.activeElement as HTMLElement);
  event.preventDefault();
  const next = index === -1 ? 0 : clampFocusIndex(index, focusables.length, event.shiftKey);
  focusables[next]?.focus();
}
