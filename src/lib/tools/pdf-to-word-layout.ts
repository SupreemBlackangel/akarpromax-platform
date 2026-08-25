export type PositionedPdfText = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction?: string;
  fontName?: string;
};

export type PdfTextBlock = {
  text: string;
  x: number;
  width: number;
  rtl: boolean;
};

export type PdfTextLine = {
  y: number;
  height: number;
  text: string;
  rtl: boolean;
  blocks: PdfTextBlock[];
};

const ARABIC_RE = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/g;
const PRESENTATION_FORMS_RE = /[\ufb50-\ufdff\ufe70-\ufeff]/;
const SPACE_BEFORE_PUNCTUATION_RE = /\s+([،,:؛;.؟!?%)\]])/g;
const SPACE_AFTER_OPENING_RE = /([(\[])\s+/g;

export function normalizePdfText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(SPACE_BEFORE_PUNCTUATION_RE, "$1")
    .replace(SPACE_AFTER_OPENING_RE, "$1")
    .trim();
}

export function hasArabic(value: string): boolean {
  return (value.match(ARABIC_RE)?.length ?? 0) > 0;
}

export function isArabicDominant(value: string): boolean {
  const normalized = normalizePdfText(value);
  const arabicCount = normalized.match(ARABIC_RE)?.length ?? 0;
  const letterCount = normalized.match(/[A-Za-z\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/g)?.length ?? 0;
  return arabicCount > 0 && arabicCount >= Math.max(1, letterCount * 0.35);
}

function joinFragments(fragments: PositionedPdfText[], rtl: boolean): string {
  const ordered = [...fragments].sort((a, b) => (rtl ? b.x - a.x : a.x - b.x));
  return normalizePdfText(ordered.map((fragment) => normalizePdfText(fragment.text)).filter(Boolean).join(" "));
}

function mergeLineFragments(fragments: PositionedPdfText[], medianHeight: number): PdfTextBlock[] {
  const ordered = [...fragments].sort((a, b) => a.x - b.x);
  const gapThreshold = Math.max(9, medianHeight * 1.15);
  const groups: PositionedPdfText[][] = [];

  for (const fragment of ordered) {
    const previousGroup = groups.at(-1);
    const previous = previousGroup?.at(-1);
    const gap = previous ? fragment.x - (previous.x + previous.width) : Number.POSITIVE_INFINITY;

    if (!previousGroup || gap > gapThreshold) groups.push([fragment]);
    else previousGroup.push(fragment);
  }

  return groups.map((group) => {
    const rawText = group.map((fragment) => fragment.text).join(" ");
    const rtl = group.some((fragment) => fragment.direction === "rtl") || isArabicDominant(rawText);
    const left = Math.min(...group.map((fragment) => fragment.x));
    const right = Math.max(...group.map((fragment) => fragment.x + fragment.width));
    return {
      text: joinFragments(group, rtl),
      x: left,
      width: Math.max(0, right - left),
      rtl,
    };
  });
}

export function groupPdfTextIntoLines(items: PositionedPdfText[]): PdfTextLine[] {
  const usableItems = items
    .map((item) => ({ ...item, text: item.text.trim() }))
    .filter((item) => item.text.length > 0 && Number.isFinite(item.x) && Number.isFinite(item.y));

  if (usableItems.length === 0) return [];

  const heights = usableItems.map((item) => Math.max(1, item.height)).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] ?? 10;
  const yTolerance = Math.max(2, medianHeight * 0.35);
  const groups: Array<{ y: number; items: PositionedPdfText[] }> = [];

  for (const item of [...usableItems].sort((a, b) => b.y - a.y || a.x - b.x)) {
    let closest: { y: number; items: PositionedPdfText[] } | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const group of groups) {
      const distance = Math.abs(group.y - item.y);
      if (distance <= yTolerance && distance < closestDistance) {
        closest = group;
        closestDistance = distance;
      }
    }

    if (closest) {
      closest.items.push(item);
      closest.y = closest.items.reduce((sum, current) => sum + current.y, 0) / closest.items.length;
    } else {
      groups.push({ y: item.y, items: [item] });
    }
  }

  return groups
    .sort((a, b) => b.y - a.y)
    .map((group) => {
      const rawText = group.items.map((item) => item.text).join(" ");
      const rtl = group.items.some((item) => item.direction === "rtl") || isArabicDominant(rawText);
      const height = Math.max(...group.items.map((item) => Math.max(1, item.height)));
      const blocks = mergeLineFragments(group.items, medianHeight);
      return {
        y: group.y,
        height,
        text: joinFragments(group.items, rtl),
        rtl,
        blocks,
      };
    });
}

export function isLikelyTableLine(line: PdfTextLine, pageWidth: number): boolean {
  if (line.blocks.length < 3 || line.blocks.length > 9) return false;
  const left = Math.min(...line.blocks.map((block) => block.x));
  const right = Math.max(...line.blocks.map((block) => block.x + block.width));
  return right - left >= pageWidth * 0.55;
}

export function splitLinesIntoSegments(lines: PdfTextLine[], pageWidth: number): Array<{
  kind: "text" | "table";
  lines: PdfTextLine[];
}> {
  const segments: Array<{ kind: "text" | "table"; lines: PdfTextLine[] }> = [];

  for (const line of lines) {
    const kind = isLikelyTableLine(line, pageWidth) ? "table" : "text";
    const previous = segments.at(-1);
    if (previous?.kind === kind) previous.lines.push(line);
    else segments.push({ kind, lines: [line] });
  }

  return segments.map((segment) =>
    segment.kind === "table" && segment.lines.length < 2
      ? { kind: "text" as const, lines: segment.lines }
      : segment,
  );
}

export function hasPresentationForms(value: string): boolean {
  return PRESENTATION_FORMS_RE.test(value);
}
