/**
 * Layout reconstruction from positioned text.
 *
 * A native PDF knows where every glyph sits. Flattening the page to a single
 * text stream throws that away, and column identity then has to be guessed
 * from runs of whitespace — which works until a heading wraps, a column is
 * blank, or the producer emits items out of reading order.
 *
 * This module keeps the geometry. It takes positioned items from any source
 * (pdfjs text items, an OCR engine that reports boxes) and rebuilds rows and
 * columns from coordinates, before anything tries to read meaning into the
 * numbers. It knows nothing about coordinates, countries or templates.
 */

export interface PositionedItem {
  page: number;
  /** Left edge in PDF user space. */
  x: number;
  /** Baseline, y increasing upward, as PDF user space reports it. */
  y: number;
  width: number;
  height: number;
  text: string;
}

export interface LayoutCell {
  text: string;
  x: number;
  width: number;
  /** Index of the column this cell was assigned to. */
  column: number;
  items: PositionedItem[];
}

export interface LayoutRow {
  page: number;
  /** Row baseline: the median y of its items. */
  y: number;
  cells: LayoutCell[];
  /** The row as reading-order text, cells joined by a single space. */
  text: string;
}

export interface LayoutColumn {
  index: number;
  /** Left and right bounds across every row that has a cell here. */
  left: number;
  right: number;
  /** How many rows placed a cell in this column. */
  occupancy: number;
}

export interface LayoutTable {
  page: number;
  rows: LayoutRow[];
  columns: LayoutColumn[];
}

/**
 * Two items belong to the same row when their baselines differ by less than
 * this fraction of the taller item's height. Generous enough for subscripts
 * and mixed font sizes, tight enough not to merge adjacent lines.
 */
const ROW_TOLERANCE_RATIO = 0.6;
/** Items closer than this fraction of a character width are one cell. */
const CELL_GAP_RATIO = 1.4;
/** A column must appear in at least this fraction of rows to be real. */
const COLUMN_OCCUPANCY_RATIO = 0.5;

const MAX_ITEMS = 200_000;

/** Groups positioned items into rows, per page, top to bottom. */
export function buildRows(items: readonly PositionedItem[]): LayoutRow[] {
  if (items.length === 0) return [];
  const capped = items.length > MAX_ITEMS ? items.slice(0, MAX_ITEMS) : items;

  const byPage = new Map<number, PositionedItem[]>();
  for (const item of capped) {
    if (!item.text || !item.text.trim()) continue;
    if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) continue;
    const bucket = byPage.get(item.page);
    if (bucket) bucket.push(item);
    else byPage.set(item.page, [item]);
  }

  const rows: LayoutRow[] = [];
  for (const page of [...byPage.keys()].sort((a, b) => a - b)) {
    const pageItems = (byPage.get(page) as PositionedItem[])
      .slice()
      // y descending: PDF user space puts the top of the page at high y.
      .sort((a, b) => (b.y - a.y) || (a.x - b.x));

    let current: PositionedItem[] = [];
    let currentY = Number.NaN;
    const flush = () => {
      if (current.length) rows.push(assembleRow(page, current));
      current = [];
    };

    for (const item of pageItems) {
      const tolerance = Math.max(1, (item.height || 8) * ROW_TOLERANCE_RATIO);
      if (current.length === 0 || Math.abs(item.y - currentY) <= tolerance) {
        if (current.length === 0) currentY = item.y;
        current.push(item);
      } else {
        flush();
        currentY = item.y;
        current.push(item);
      }
    }
    flush();
  }
  return rows;
}

function assembleRow(page: number, items: PositionedItem[]): LayoutRow {
  const ordered = items.slice().sort((a, b) => a.x - b.x);

  // Merge items separated by less than a character width into one cell: a PDF
  // routinely splits a single number across several text items.
  const cells: LayoutCell[] = [];
  let group: PositionedItem[] = [];
  const flushGroup = () => {
    if (!group.length) return;
    const x = group[0].x;
    const last = group[group.length - 1];
    cells.push({
      text: group.map((i) => i.text).join("").replace(/\s+/g, " ").trim(),
      x,
      width: last.x + last.width - x,
      column: -1,
      items: group,
    });
    group = [];
  };

  for (const item of ordered) {
    if (group.length === 0) {
      group.push(item);
      continue;
    }
    const previous = group[group.length - 1];
    const gap = item.x - (previous.x + previous.width);
    const charWidth = estimateCharWidth(previous);
    if (gap <= charWidth * CELL_GAP_RATIO) group.push(item);
    else {
      flushGroup();
      group.push(item);
    }
  }
  flushGroup();

  const ys = items.map((i) => i.y).sort((a, b) => a - b);
  return {
    page,
    y: ys[Math.floor(ys.length / 2)],
    cells: cells.filter((cell) => cell.text.length > 0),
    text: cells.map((cell) => cell.text).filter(Boolean).join(" "),
  };
}

function estimateCharWidth(item: PositionedItem): number {
  const length = Math.max(1, item.text.length);
  const perChar = item.width / length;
  return Number.isFinite(perChar) && perChar > 0 ? perChar : (item.height || 8) * 0.5;
}

/**
 * Infers column boundaries from the horizontal positions of cells across
 * rows, then assigns every cell to a column.
 *
 * Columns come from where text actually sits, so any column order works and a
 * blank cell leaves a hole rather than shifting everything left — which is the
 * failure that whitespace splitting cannot avoid.
 */
export function inferColumns(rows: readonly LayoutRow[]): LayoutColumn[] {
  const cells = rows.flatMap((row) => row.cells);
  if (cells.length === 0) return [];

  const starts = cells.map((cell) => cell.x).sort((a, b) => a - b);
  const spread = starts[starts.length - 1] - starts[0];
  // Cluster left edges. The threshold scales with the table's own width, so it
  // works for a narrow sketch table and a full-page schedule alike.
  const threshold = Math.max(2, spread * 0.02);

  const clusters: { left: number; right: number; members: number }[] = [];
  for (const cell of cells.slice().sort((a, b) => a.x - b.x)) {
    const last = clusters[clusters.length - 1];
    if (last && cell.x - last.left <= threshold) {
      last.right = Math.max(last.right, cell.x + cell.width);
      last.members += 1;
    } else {
      clusters.push({ left: cell.x, right: cell.x + cell.width, members: 1 });
    }
  }

  const minimumOccupancy = Math.max(1, Math.floor(rows.length * COLUMN_OCCUPANCY_RATIO));
  const kept = clusters.filter((cluster) => cluster.members >= minimumOccupancy);
  const source = kept.length >= 2 ? kept : clusters;

  return source.map((cluster, index) => ({
    index,
    left: cluster.left,
    right: cluster.right,
    occupancy: cluster.members,
  }));
}

/** Assigns each cell to its nearest column, in place, and returns the rows. */
export function assignColumns(rows: LayoutRow[], columns: readonly LayoutColumn[]): LayoutRow[] {
  if (columns.length === 0) return rows;
  for (const row of rows) {
    for (const cell of row.cells) {
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      columns.forEach((column, index) => {
        const distance = Math.abs(cell.x - column.left);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      });
      cell.column = best;
    }
  }
  return rows;
}

/** Full reconstruction: positioned items in, per-page tables out. */
export function reconstructLayout(items: readonly PositionedItem[]): LayoutTable[] {
  const rows = buildRows(items);
  const byPage = new Map<number, LayoutRow[]>();
  for (const row of rows) {
    const bucket = byPage.get(row.page);
    if (bucket) bucket.push(row);
    else byPage.set(row.page, [row]);
  }
  return [...byPage.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([page, pageRows]) => {
      const columns = inferColumns(pageRows);
      return { page, rows: assignColumns(pageRows, columns), columns };
    });
}

/**
 * Adapter for pdfjs `getTextContent()` items.
 *
 * `transform` is [a, b, c, d, e, f]; e and f are the translation, and d is the
 * vertical scale, which is the closest thing pdfjs gives to a glyph height.
 * Kept separate from the reconstruction above so the layout engine stays
 * independent of any one PDF library.
 */
export function fromPdfjsTextItems(
  page: number,
  items: readonly { str?: string; transform?: number[]; width?: number; height?: number }[],
): PositionedItem[] {
  const out: PositionedItem[] = [];
  for (const item of items) {
    const text = item.str ?? "";
    const transform = item.transform;
    if (!text || !Array.isArray(transform) || transform.length < 6) continue;
    const x = transform[4];
    const y = transform[5];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const height = item.height && item.height > 0 ? item.height : Math.abs(transform[3]) || 8;
    const width = item.width && item.width > 0 ? item.width : text.length * height * 0.5;
    out.push({ page, x, y, width, height, text });
  }
  return out;
}
