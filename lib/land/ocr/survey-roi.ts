/**
 * Survey-table region-of-interest detection.
 *
 * The primary OCR pass reads the whole page once, cheaply. This module looks
 * at what that pass produced — words with positions — and asks where on the
 * page a coordinate table most plausibly sits, so the expensive high-quality
 * OCR can be spent on that rectangle alone. It works from vocabulary and
 * numeric structure, never from templates: a bordered Omani krooki, a
 * borderless Turkish aplikasyon sheet and an English schedule all satisfy the
 * same evidence.
 */
import { reconstructLayout, type LayoutTable, type PositionedItem } from "@/lib/land/intelligence/layout";
import { classifyAxisToken, classifyColumn } from "@/lib/land/intelligence/patterns/labels";
import { parseNumericCell } from "@/lib/land/intelligence/table-extraction";

export interface SurveyTableROI {
  page: number;
  /** Page-space bbox: x/y is the lower-left corner (PDF convention). */
  bbox: { x: number; y: number; width: number; height: number };
  /** 0..1 — never a guarantee, only a ranking. */
  confidence: number;
  detectionReasons: string[];
  estimatedRows: number;
  estimatedColumns: number;
  candidateHeaders: string[];
}

/** How many ROIs one document may spend deep OCR on. */
export const MAX_ROIS_PER_DOCUMENT = 3;
const MIN_NUMERIC_ROWS = 2;
/** Margin added around the detected cluster, as a fraction of its size. */
const BBOX_MARGIN_RATIO = 0.12;

interface RowEvidence {
  y: number;
  minX: number;
  maxX: number;
  height: number;
  numericCells: number;
  headerHits: string[];
  axisHits: string[];
}

function assessTableRows(table: LayoutTable): RowEvidence[] {
  return table.rows.map((row) => {
    const headerHits: string[] = [];
    const axisHits: string[] = [];
    let numericCells = 0;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = 0;
    let height = 8;
    for (const cell of row.cells) {
      minX = Math.min(minX, cell.x);
      maxX = Math.max(maxX, cell.x + cell.width);
      for (const item of cell.items) height = Math.max(height, item.height);
      if (parseNumericCell(cell.text) !== null) numericCells += 1;
      const role = classifyColumn(cell.text);
      if (role !== "UNKNOWN") headerHits.push(cell.text);
      const axis = classifyAxisToken(cell.text);
      if (axis) axisHits.push(cell.text);
    }
    return {
      y: row.y,
      minX: Number.isFinite(minX) ? minX : 0,
      maxX,
      height,
      numericCells,
      headerHits,
      axisHits,
    };
  });
}

/**
 * Detects candidate survey-table regions on the pages covered by the given
 * positioned items. The items may come from a native text layer or from OCR —
 * the evidence reads identically.
 */
export function detectSurveyTableROIs(
  items: readonly PositionedItem[],
  options: { maxRois?: number } = {},
): SurveyTableROI[] {
  const maxRois = Math.max(1, options.maxRois ?? MAX_ROIS_PER_DOCUMENT);
  const rois: SurveyTableROI[] = [];

  for (const table of reconstructLayout(items)) {
    const rows = assessTableRows(table);

    // Slide over the rows and grow clusters of consecutive numeric rows,
    // allowing small index gaps (a rule line, an OCR dropout) but never a
    // large vertical jump: two tables separated by half a page are two
    // tables, however contiguous their row indices are.
    const numericSpacings: number[] = [];
    let previousNumericY: number | null = null;
    for (const row of rows) {
      if (row.numericCells < 2) continue;
      if (previousNumericY !== null) numericSpacings.push(Math.abs(previousNumericY - row.y));
      previousNumericY = row.y;
    }
    numericSpacings.sort((a, b) => a - b);
    const modalSpacing = numericSpacings[Math.floor(numericSpacings.length / 2)] ?? 0;
    const verticalBreak = Math.max(40, modalSpacing * 4);

    let start = -1;
    let gap = 0;
    let lastNumericY = 0;
    const clusters: { from: number; to: number }[] = [];
    for (let index = 0; index <= rows.length; index += 1) {
      const numeric = index < rows.length && rows[index].numericCells >= 2;
      const jumped = numeric && start >= 0 && Math.abs(lastNumericY - rows[index].y) > verticalBreak;
      if (numeric && !jumped) {
        if (start < 0) start = index;
        gap = 0;
        lastNumericY = rows[index].y;
      } else if (start >= 0) {
        gap += 1;
        if (jumped || gap > 2 || index === rows.length) {
          clusters.push({ from: start, to: index - (jumped ? 1 : gap) });
          start = jumped ? index : -1;
          gap = 0;
          if (jumped) lastNumericY = rows[index].y;
        }
      }
    }

    for (const cluster of clusters) {
      const memberRows = rows.slice(cluster.from, cluster.to + 1)
        .filter((row) => row.numericCells >= 2);
      if (memberRows.length < MIN_NUMERIC_ROWS) continue;

      // Headers may sit just above the cluster — but only just above: a row
      // half a page away belongs to something else entirely.
      const clusterTopY = Math.max(...memberRows.map((row) => row.y));
      const headerRows = rows
        .slice(Math.max(0, cluster.from - 2), cluster.from)
        .filter((row) => Math.abs(row.y - clusterTopY) <= verticalBreak * 1.5);
      const candidateHeaders = [
        ...headerRows.flatMap((row) => [...row.headerHits, ...row.axisHits]),
        ...memberRows.flatMap((row) => row.headerHits),
      ];

      const reasons: string[] = [
        `${memberRows.length} aligned numeric rows`,
      ];
      const columnCounts = memberRows.map((row) => row.numericCells);
      const modalColumns = columnCounts.sort((a, b) => a - b)[Math.floor(columnCounts.length / 2)];
      const consistent = columnCounts.filter((count) => Math.abs(count - modalColumns) <= 1).length;
      if (consistent / memberRows.length >= 0.7) {
        reasons.push("consistent numeric column count across rows");
      }
      if (candidateHeaders.length > 0) {
        reasons.push(`survey headers nearby: ${[...new Set(candidateHeaders)].slice(0, 4).join(", ")}`);
      }

      let confidence = Math.min(0.5, memberRows.length / 12)
        + (candidateHeaders.length > 0 ? 0.3 : 0)
        + (consistent / memberRows.length >= 0.7 ? 0.2 : 0);
      confidence = Math.max(0, Math.min(1, confidence));

      const allRows = [...memberRows, ...headerRows];
      const minX = Math.min(...allRows.map((row) => row.minX));
      const maxX = Math.max(...allRows.map((row) => row.maxX));
      const ys = allRows.map((row) => row.y);
      const heights = allRows.map((row) => row.height);
      const minY = Math.min(...ys) - Math.max(...heights);
      const maxY = Math.max(...ys) + Math.max(...heights);
      const marginX = (maxX - minX) * BBOX_MARGIN_RATIO;
      const marginY = (maxY - minY) * BBOX_MARGIN_RATIO;

      rois.push({
        page: table.page,
        bbox: {
          x: Math.max(0, minX - marginX),
          y: Math.max(0, minY - marginY),
          width: (maxX - minX) + marginX * 2,
          height: (maxY - minY) + marginY * 2,
        },
        confidence,
        detectionReasons: reasons,
        estimatedRows: memberRows.length,
        estimatedColumns: modalColumns,
        candidateHeaders: [...new Set(candidateHeaders)].slice(0, 8),
      });
    }
  }

  return rois
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, maxRois);
}
