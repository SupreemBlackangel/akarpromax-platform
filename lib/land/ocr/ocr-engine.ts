import { logger } from '@/lib/logging/logger';
import {
  fromPdfjsTextItems,
  reconstructLayout,
  type PositionedItem,
} from '@/lib/land/intelligence/layout';
import { extractTablesFromLayout, parseNumericCell } from '@/lib/land/intelligence/table-extraction';
import {
  parseTesseractTsv,
  type OcrWordBox,
} from '@/lib/land/intelligence/positioned-evidence';
import type { RejectedRow } from '@/lib/land/intelligence/row-accounting';
import {
  selectPagesForOcr,
  surveyVocabularyHits,
  type PageTextStats,
} from './page-evidence';
import { chooseOcrLanguages } from './languages';
import { resolveTessdata } from './tessdata';
import { correctPageGeometry, type AppliedOperation } from './geometry-correction';
import { detectSurveyTableROIs, type SurveyTableROI, MAX_ROIS_PER_DOCUMENT } from './survey-roi';
import { reconcileOcrPasses, type PassItems } from './cell-consensus';
import { grayToPng, scaleGray, toGray, RASTER_LIMITS, type GrayImage } from './raster';

/**
 * OCR pipeline version — distinct from the coordinate engine's own version.
 * 1.x: full-page OCR of selected pages.
 * 2.0.0: quality assessment, geometric correction, adaptive preprocessing,
 *        survey-table ROI, numeric second pass, cell-level consensus,
 *        language availability routing.
 */
export const OCR_PIPELINE_VERSION = '2.0.0';

// ── OCR Bounding Policy ──────────────────────────────────────────────────────
// Centralised, configurable limits so the API NEVER hangs on OCR. These are
// catastrophic safety stops, not performance targets.

export const OCR_POLICY = {
  /** Maximum milliseconds for a single page OCR pass. */
  PAGE_TIMEOUT_MS: 30_000,
  /** Maximum milliseconds for the entire document OCR phase. */
  DOCUMENT_TIMEOUT_MS: 120_000,
  /** Maximum pages eligible for OCR in a single document. */
  MAX_OCR_PAGES: 8,
  /** Maximum concurrent Tesseract worker instances across the process. */
  MAX_CONCURRENT_WORKERS: 2,
  /** Maximum retry count per page (0 = no retry). */
  MAX_RETRIES: 0,
  /** Maximum focused ROI OCR passes per document (ROI + numeric combined). */
  MAX_ROI_PASSES: 6,
} as const;

let activeWorkerCount = 0;

/** Explainable per-request OCR quality summary. */
export interface OCRQuality {
  overall: 'HIGH' | 'MEDIUM' | 'LOW';
  tableQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  numericAgreement: number;
  conflictCount: number;
  unreadableCells: number;
  lowConfidenceCells: number;
  languagesUsed: string[];
  preprocessingUsed: string[];
  pageCountOCRd: number;
  roiCount: number;
  totalOCRTimeMs: number;
}

interface OcrRunStats {
  pagesInspected: number;
  pagesRasterized: number;
  pagesOcrd: number;
  roisDetected: number;
  roiPasses: number;
  numericPasses: number;
  megapixelsProcessed: number;
  pageTimeouts: number;
  documentTimeoutHit: boolean;
  languagesUsed: Set<string>;
  preprocessingUsed: Set<string>;
  ocrTimeMs: number;
}

function emptyStats(): OcrRunStats {
  return {
    pagesInspected: 0,
    pagesRasterized: 0,
    pagesOcrd: 0,
    roisDetected: 0,
    roiPasses: 0,
    numericPasses: 0,
    megapixelsProcessed: 0,
    pageTimeouts: 0,
    documentTimeoutHit: false,
    languagesUsed: new Set(),
    preprocessingUsed: new Set(),
    ocrTimeMs: 0,
  };
}

export type OcrResult = {
  text: string;
  confidence: number;
  blocks: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  /**
   * Every word with its place on the page, from the text layer and from OCR
   * alike. This is what the layout and table readers consume; `text` is the
   * same content flattened, kept for the readers that only take a string.
   */
  positionedItems: PositionedItem[];
  /** Per-page evidence, so a caller can see why OCR did or did not run. */
  pageStats: PageTextStats[];
  /** Pages that were rasterised and read as pictures, and why. */
  ocrPages: { page: number; reasons: string[] }[];
  /** Survey-table regions the pipeline focused on. */
  rois: SurveyTableROI[];
  /**
   * Coordinate rows whose OCR cells conflicted or could not be read. These
   * feed the resolver's row accounting so no survey row can vanish silently.
   */
  cellRejections: RejectedRow[];
  /** Explainable quality summary for this document's OCR. */
  quality: OCRQuality;
  extractedData: {
    parcelNumber?: string;
    blockNumber?: string;
    area?: number;
    owner?: string;
    date?: string;
    coordinates?: { lat: number; lng: number };
  };
};

function emptyQuality(): OCRQuality {
  return {
    overall: 'LOW',
    tableQuality: 'NONE',
    numericAgreement: 0,
    conflictCount: 0,
    unreadableCells: 0,
    lowConfidenceCells: 0,
    languagesUsed: [],
    preprocessingUsed: [],
    pageCountOCRd: 0,
    roiCount: 0,
    totalOCRTimeMs: 0,
  };
}

function emptyResult(): OcrResult {
  return {
    text: '',
    confidence: 0,
    blocks: [],
    positionedItems: [],
    pageStats: [],
    ocrPages: [],
    rois: [],
    cellRejections: [],
    quality: emptyQuality(),
    extractedData: {},
  };
}

export async function extractDocumentData(fileBuffer: ArrayBuffer, mimeType: string): Promise<OcrResult> {
  logger.info('OCR processing started', { mimeType, size: fileBuffer.byteLength, pipeline: OCR_PIPELINE_VERSION });

  try {
    let result: OcrResult;
    if (mimeType === 'application/pdf') {
      result = await processPdf(fileBuffer);
    } else if (mimeType.startsWith('image/')) {
      result = await processImage(fileBuffer);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      result = await processDocx(fileBuffer);
    } else {
      result = emptyResult();
    }
    return result;
  } catch (error) {
    logger.error(error as Error, { message: 'OCR processing failed' });
    return emptyResult();
  }
}

/** Bounded work: a survey document is not a book. */
const RASTER_TARGET_DPI = 200;
const RASTER_MAX_PIXELS = 6_000_000;
/** ROI crops re-read at up to this DPI-equivalent, only where useful. */
const ROI_TARGET_DPI = 340;

// ── Worker lifecycle ─────────────────────────────────────────────────────────

type TesseractModule = typeof import('tesseract.js');
type TesseractWorker = Awaited<ReturnType<TesseractModule['createWorker']>>;

/**
 * Per-request worker cache: one worker per language profile, reused across
 * pages and ROI passes, always terminated in the caller's finally. Reuse is
 * where most of the old pipeline's time went — model load is far more
 * expensive than recognition.
 */
class OcrWorkerPool {
  private workers = new Map<string, TesseractWorker>();
  private module: TesseractModule | null = null;

  async acquire(languages: string): Promise<{ worker: TesseractWorker; languages: string } | null> {
    const resolution = resolveTessdata(languages);
    const key = `${resolution.languages}|${resolution.langPath ?? 'cdn'}`;
    const existing = this.workers.get(key);
    if (existing) { return { worker: existing, languages: resolution.languages }; }

    if (activeWorkerCount >= OCR_POLICY.MAX_CONCURRENT_WORKERS) {
      logger.debug('OCR worker denied: concurrent limit reached');
      return null;
    }
    this.module ??= await import('tesseract.js');
    const options: Record<string, unknown> = {
      // A worker-level error must degrade the pass, never crash the process.
      errorHandler: (error: unknown) => logger.debug(`tesseract worker error: ${String(error)}`),
    };
    if (resolution.langPath) {
      options.langPath = resolution.langPath;
      options.gzip = true;
    }
      for (const drop of resolution.dropped) {
        logger.warn('OCR language unavailable', drop);
      }
      try {
        activeWorkerCount += 1;
        const worker = await this.module.createWorker(resolution.languages, undefined, options);
        await worker.setParameters({ preserve_interword_spaces: '1' });
        this.workers.set(key, worker);
        return { worker, languages: resolution.languages };
    } catch (error) {
      activeWorkerCount = Math.max(0, activeWorkerCount - 1);
      logger.warn('OCR worker failed to start', { languages: resolution.languages, error: (error as Error).message });
      // Graceful degradation: English alone, else give up quietly.
      if (resolution.languages !== 'eng') return this.acquire('eng');
      return null;
    }
  }

  async terminateAll(): Promise<void> {
    for (const worker of this.workers.values()) {
      try {
        await worker.terminate();
      } catch {
        /* cleanup must never throw */
      }
      activeWorkerCount = Math.max(0, activeWorkerCount - 1);
    }
    this.workers.clear();
  }
}

interface RecognizeOutcome {
  text: string;
  confidence: number;
  words: OcrWordBox[];
  timedOut: boolean;
}

/**
 * One bounded recognition. Input is a PNG Buffer — never a Blob, which the
 * Node worker cannot read and which used to surface as a worker-level crash.
 */
async function recognizeBounded(
  worker: TesseractWorker,
  png: Uint8Array,
  stats: OcrRunStats,
  cache: Map<string, RecognizeOutcome>,
  cacheKey: string,
): Promise<RecognizeOutcome | null> {
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const started = Date.now();
  try {
    const result = await Promise.race([
      worker.recognize(Buffer.from(png), {}, { text: true, tsv: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR_PAGE_TIMEOUT')), OCR_POLICY.PAGE_TIMEOUT_MS),
      ),
    ]);
    const data = result.data as typeof result.data & { tsv?: string };
    const outcome: RecognizeOutcome = {
      text: data.text ?? '',
      confidence: (data.confidence ?? 0) / 100,
      words: parseTesseractTsv(data.tsv),
      timedOut: false,
    };
    cache.set(cacheKey, outcome);
    return outcome;
  } catch (error) {
    if ((error as Error).message === 'OCR_PAGE_TIMEOUT') {
      stats.pageTimeouts += 1;
      logger.warn('OCR page timed out', { timeoutMs: OCR_POLICY.PAGE_TIMEOUT_MS });
    } else {
      logger.debug(`OCR pass failed: ${(error as Error).message}`);
    }
    return null;
  } finally {
    stats.ocrTimeMs += Date.now() - started;
  }
}

// ── Page recognition (shared by the PDF and image paths) ─────────────────────

interface PageRecognition {
  /** Words in page space. */
  items: PositionedItem[];
  text: string;
  confidence: number;
  rois: SurveyTableROI[];
  cellRejections: RejectedRow[];
  applied: AppliedOperation[];
  conflictCount: number;
  unreadableCount: number;
  lowConfidenceCount: number;
  numericAgreement: number;
}

/**
 * The complete V2 read of one raster page:
 * geometry correction → adaptive preprocessing → primary OCR → ROI detection
 * → high-quality ROI OCR → numeric second pass → cell consensus.
 *
 * Native-PDF evidence and OCR evidence converge because the output is plain
 * positioned words: the same semantic engine reads both.
 */
async function recognizePageRaster(
  pool: OcrWorkerPool,
  raster: GrayImage,
  pageNumber: number,
  pageSize: { width: number; height: number },
  languages: string,
  stats: OcrRunStats,
  deadline: number,
): Promise<PageRecognition | null> {
  const cache = new Map<string, RecognizeOutcome>();

  const corrected = await correctPageGeometry(raster);
  for (const operation of corrected.applied) stats.preprocessingUsed.add(operation.operation);
  const image = corrected.image;
  stats.megapixelsProcessed += (image.width * image.height) / 1e6;

  const acquired = await pool.acquire(languages);
  if (!acquired) return null;
  stats.languagesUsed.add(acquired.languages);

  const png = await grayToPng(image);
  if (!png) return null;

  const primary = await recognizeBounded(acquired.worker, png, stats, cache, `page:${pageNumber}`);
  if (!primary) return null;
  stats.pagesOcrd += 1;

  // Raster-space words for consensus; page-space mapping happens at the end.
  const rasterWords = primary.words;
  const rasterItems: PositionedItem[] = rasterWords
    .filter((word) => word.text.trim().length > 0)
    .map((word) => ({
      page: pageNumber,
      x: word.left,
      y: image.height - word.top - word.height,
      width: Math.max(1, word.width),
      height: Math.max(1, word.height),
      text: word.text.trim(),
    }));

  // ── Survey-table ROI ────────────────────────────────────────────────────
  const rois = detectSurveyTableROIs(rasterItems, { maxRois: MAX_ROIS_PER_DOCUMENT });
  stats.roisDetected += rois.length;

  const passes: PassItems[] = [{ kind: 'primary', items: rasterItems }];
  for (let roiIdx = 0; roiIdx < rois.length; roiIdx++) {
    const roi = rois[roiIdx];
    if (Date.now() > deadline) {
      stats.documentTimeoutHit = true;
      break;
    }
    if (stats.roiPasses + stats.numericPasses >= OCR_POLICY.MAX_ROI_PASSES) break;
    if (roi.confidence < 0.35) continue;

    // Crop in raster space (bbox y is bottom-up).
    const cropX = Math.max(0, Math.floor(roi.bbox.x));
    const cropTop = Math.max(0, Math.floor(image.height - (roi.bbox.y + roi.bbox.height)));
    const cropWidth = Math.min(image.width - cropX, Math.ceil(roi.bbox.width));
    const cropHeight = Math.min(image.height - cropTop, Math.ceil(roi.bbox.height));
    if (cropWidth < 24 || cropHeight < 12) continue;
    const crop: GrayImage = {
      width: cropWidth,
      height: cropHeight,
      data: cropGray(image, cropX, cropTop, cropWidth, cropHeight),
    };

    // Re-read the ROI at a higher effective resolution, bounded.
    const scaleFactor = Math.min(
      ROI_TARGET_DPI / RASTER_TARGET_DPI,
      RASTER_LIMITS.MAX_DIMENSION / Math.max(crop.width, crop.height),
    );
    const roiImage = scaleFactor > 1.1 ? await scaleGray(crop, scaleFactor) : crop;
    stats.megapixelsProcessed += (roiImage.width * roiImage.height) / 1e6;
    const roiPng = await grayToPng(roiImage);
    if (!roiPng) continue;

    const roiOutcome = await recognizeBounded(
      acquired.worker, roiPng, stats, cache, `roi:${pageNumber}:${cropX}:${cropTop}`,
    );
    if (roiOutcome) {
      stats.roiPasses += 1;
      passes.push({
        kind: 'roi',
        items: mapWordsIntoRaster(roiOutcome.words, pageNumber, image, cropX, cropTop, roiImage, crop),
      });
    }

    // Numeric second pass — same crop, digits-first character set. Only ever
    // inside a detected table region, never over arbitrary page area.
    if (Date.now() <= deadline && stats.roiPasses + stats.numericPasses < OCR_POLICY.MAX_ROI_PASSES) {
      const numericAcquired = await pool.acquire('eng');
      if (numericAcquired) {
        try {
          await numericAcquired.worker.setParameters({
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: '0123456789.,-+NSEWXYnsewxy°\'"',
          });
          const numericOutcome = await recognizeBounded(
            numericAcquired.worker, roiPng, stats, cache, `num:${pageNumber}:${cropX}:${cropTop}`,
          );
          if (numericOutcome) {
            stats.numericPasses += 1;
            passes.push({
              kind: 'numeric',
              items: mapWordsIntoRaster(numericOutcome.words, pageNumber, image, cropX, cropTop, roiImage, crop),
            });
          }
        } finally {
          await numericAcquired.worker.setParameters({ tessedit_char_whitelist: '' });
        }
      }
    }
  }

  // ── Consensus in raster space ───────────────────────────────────────────
  const consensus = reconcileOcrPasses(passes);
  const agreedCells = consensus.cells.filter((cell) => cell.status === 'VERIFIED_CELL').length;
  const numericAgreement = consensus.cells.length > 0 ? agreedCells / consensus.cells.length : 0;

  // Map raster-space items into page space.
  const scaleX = pageSize.width / image.width;
  const scaleY = pageSize.height / image.height;
  const pageItems = consensus.items.map((item) => ({
    page: pageNumber,
    x: item.x * scaleX,
    y: item.y * scaleY,
    width: Math.max(1, item.width * scaleX),
    height: Math.max(1, item.height * scaleY),
    text: item.text,
  }));
  const pageRois = rois.map((roi) => ({
    ...roi,
    bbox: {
      x: roi.bbox.x * scaleX,
      y: roi.bbox.y * scaleY,
      width: roi.bbox.width * scaleX,
      height: roi.bbox.height * scaleY,
    },
  }));

  return {
    items: pageItems,
    text: primary.text,
    confidence: primary.confidence,
    rois: pageRois,
    cellRejections: consensus.rejections,
    applied: corrected.applied,
    conflictCount: consensus.conflictCount,
    unreadableCount: consensus.unreadableCount,
    lowConfidenceCount: consensus.lowConfidenceCount,
    numericAgreement,
  };
}

function cropGray(image: GrayImage, x: number, y: number, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  for (let row = 0; row < height; row += 1) {
    out.set(image.data.subarray((y + row) * image.width + x, (y + row) * image.width + x + width), row * width);
  }
  return out;
}

/** Maps words recognised in a (possibly upscaled) crop back to raster space. */
function mapWordsIntoRaster(
  words: readonly OcrWordBox[],
  pageNumber: number,
  raster: GrayImage,
  cropX: number,
  cropTop: number,
  scaled: GrayImage,
  crop: GrayImage,
): PositionedItem[] {
  const factorX = crop.width / Math.max(1, scaled.width);
  const factorY = crop.height / Math.max(1, scaled.height);
  return words
    .filter((word) => word.text.trim().length > 0)
    .map((word) => {
      const left = cropX + word.left * factorX;
      const top = cropTop + word.top * factorY;
      const height = Math.max(1, word.height * factorY);
      return {
        page: pageNumber,
        x: left,
        y: raster.height - top - height,
        width: Math.max(1, word.width * factorX),
        height,
        text: word.text.trim(),
      };
    });
}

// ── PDF path ─────────────────────────────────────────────────────────────────

async function processPdf(buffer: ArrayBuffer): Promise<OcrResult> {
  let _s: number;
  // The default pdfjs build expects browser globals such as DOMMatrix. The
  // legacy build is the supported Node/server entry and keeps uploaded PDFs
  // from silently falling through as empty documents.
  // Load the matching worker eagerly as well: production bundlers otherwise
  // leave PDF.js looking for `pdf.worker.mjs` beside the generated server
  // chunk, which does not exist at runtime.
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // PDF.js may transfer (detach) the supplied ArrayBuffer to its worker. Give
  // it an isolated copy so callers can still use the original upload metadata
  // after text extraction.
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
  let fullText = '';
  const blocks: OcrResult['blocks'] = [];
  const positionedItems: PositionedItem[] = [];
  const pageStats: PageTextStats[] = [];
  const pageSizes = new Map<number, { width: number; height: number }>();
  const stats = emptyStats();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    pageSizes.set(i, { width: viewport.width, height: viewport.height });
    const content = await page.getTextContent();
    stats.pagesInspected += 1;

    let pageText = '';
    let textArea = 0;
    for (const item of content.items) {
      if ('str' in item) {
        fullText += item.str + ' ';
        pageText += item.str + ' ';
        textArea += (item.width ?? 0) * (item.height ?? 8);
        blocks.push({
          text: item.str,
          confidence: 0.9,
          bbox: {
            x0: item.transform[4],
            y0: item.transform[5],
            x1: item.transform[4] + (item.width ?? 0),
            y1: item.transform[5] + (item.height ?? 0),
          },
        });
      }
    }

    const pageItems = fromPdfjsTextItems(i, content.items as never);
    positionedItems.push(...pageItems);
    pageStats.push(measurePage(i, pageItems, pageText, {
      pageArea: Math.max(1, viewport.width * viewport.height),
      textArea,
      imageOperations: await countImageOperations(page, pdfjsLib),
    }));
  }

  // --- Pages whose evidence is a picture --------------------------------
  // Selection is by page evidence, wherever the page sits in the document.
  const selected = selectPagesForOcr(pageStats, { maxPages: OCR_POLICY.MAX_OCR_PAGES });
  const ocrPages: OcrResult['ocrPages'] = [];
  const rois: SurveyTableROI[] = [];
  const cellRejections: RejectedRow[] = [];
  let ocrConfidence = 0;
  let conflictCount = 0;
  let unreadableCells = 0;
  let lowConfidenceCells = 0;
  let numericAgreementSum = 0;
  const preprocessingUsed = new Set<string>();

  if (selected.length > 0) {
    const pool = new OcrWorkerPool();
    const deadline = Date.now() + OCR_POLICY.DOCUMENT_TIMEOUT_MS;
    const languages = chooseOcrLanguages(fullText);
    try {
      for (const candidate of selected) {
        if (Date.now() > deadline) {
          stats.documentTimeoutHit = true;
          logger.warn('OCR document budget exhausted', {
            budgetMs: OCR_POLICY.DOCUMENT_TIMEOUT_MS,
            pagesProcessed: ocrPages.length,
            pagesRemaining: selected.length - ocrPages.length,
          });
          break;
        }

        const rendered = await renderPdfPageGray(pdf, candidate.page);
        if (!rendered) continue;
        stats.pagesRasterized += 1;
        const size = pageSizes.get(candidate.page) ?? { width: rendered.width, height: rendered.height };
        const recognition = await recognizePageRaster(
          pool, rendered, candidate.page, size, languages, stats, deadline,
        );
        if (!recognition) continue;
        positionedItems.push(...recognition.items);
        fullText += '\n' + recognition.text;
        ocrConfidence = Math.max(ocrConfidence, recognition.confidence);
        ocrPages.push({ page: candidate.page, reasons: candidate.reasons });
        rois.push(...recognition.rois);
        cellRejections.push(...recognition.cellRejections);
        conflictCount += recognition.conflictCount;
        unreadableCells += recognition.unreadableCount;
        lowConfidenceCells += recognition.lowConfidenceCount;
        numericAgreementSum += recognition.numericAgreement;
        for (const operation of recognition.applied) preprocessingUsed.add(operation.operation);
      }
    } finally {
      await pool.terminateAll();
    }
  }

  const quality = buildQuality({
    stats,
    conflictCount,
    unreadableCells,
    lowConfidenceCells,
    numericAgreement: ocrPages.length > 0 ? numericAgreementSum / ocrPages.length : 0,
    preprocessingUsed,
    ocrPageCount: ocrPages.length,
    roiCount: rois.length,
    ocrConfidence,
    hadRois: rois.length > 0,
  });
  logOcrDiagnostics('pdf', stats, quality);

  return {
    text: fullText.trim(),
    confidence: ocrPages.length > 0 ? Math.max(0.5, ocrConfidence) : 0.85,
    blocks,
    positionedItems,
    pageStats,
    ocrPages,
    rois,
    cellRejections,
    quality,
    extractedData: extractStructuredData(fullText),
  };
}

function buildQuality(input: {
  stats: OcrRunStats;
  conflictCount: number;
  unreadableCells: number;
  lowConfidenceCells: number;
  numericAgreement: number;
  preprocessingUsed: Set<string>;
  ocrPageCount: number;
  roiCount: number;
  ocrConfidence: number;
  hadRois: boolean;
}): OCRQuality {
  const tableQuality: OCRQuality['tableQuality'] = !input.hadRois
    ? 'NONE'
    : input.conflictCount === 0 && input.numericAgreement >= 0.6
      ? 'HIGH'
      : input.conflictCount <= 2
        ? 'MEDIUM'
        : 'LOW';
  const overall: OCRQuality['overall'] = input.ocrPageCount === 0
    ? 'HIGH' // nothing needed OCR: the text layer carried the document
    : input.ocrConfidence >= 0.75 && input.conflictCount === 0
      ? 'HIGH'
      : input.ocrConfidence >= 0.5
        ? 'MEDIUM'
        : 'LOW';
  return {
    overall,
    tableQuality,
    numericAgreement: Number(input.numericAgreement.toFixed(3)),
    conflictCount: input.conflictCount,
    unreadableCells: input.unreadableCells,
    lowConfidenceCells: input.lowConfidenceCells,
    languagesUsed: [...input.stats.languagesUsed],
    preprocessingUsed: [...input.preprocessingUsed],
    pageCountOCRd: input.ocrPageCount,
    roiCount: input.roiCount,
    totalOCRTimeMs: input.stats.ocrTimeMs,
  };
}

/** Development observability. Never logs document content. */
function logOcrDiagnostics(kind: string, stats: OcrRunStats, quality: OCRQuality): void {
  logger.info('OCR pipeline summary', {
    pipeline: OCR_PIPELINE_VERSION,
    kind,
    pagesInspected: stats.pagesInspected,
    pagesRasterized: stats.pagesRasterized,
    pagesOcrd: stats.pagesOcrd,
    roisDetected: stats.roisDetected,
    roiPasses: stats.roiPasses,
    numericPasses: stats.numericPasses,
    megapixels: Number(stats.megapixelsProcessed.toFixed(2)),
    pageTimeouts: stats.pageTimeouts,
    documentTimeoutHit: stats.documentTimeoutHit,
    ocrTimeMs: stats.ocrTimeMs,
    languages: [...stats.languagesUsed],
    preprocessing: [...stats.preprocessingUsed],
    quality: quality.overall,
    tableQuality: quality.tableQuality,
    conflicts: quality.conflictCount,
  });
}

/** Per-page evidence, computed once and shared by every downstream decision. */
function measurePage(
  page: number,
  items: readonly PositionedItem[],
  pageText: string,
  metrics: { pageArea: number; textArea: number; imageOperations: number },
): PageTextStats {
  const tables = reconstructLayout(items.filter((item) => item.page === page));
  const numericRows = tables.reduce(
    (total, table) => total + table.rows.filter(
      (row) => row.cells.filter((cell) => parseNumericCell(cell.text) !== null).length >= 2,
    ).length,
    0,
  );
  const coordinateRows = extractTablesFromLayout(tables, { documentText: pageText })
    .reduce((total, reading) => total + reading.rows.length, 0);

  return {
    page,
    textChars: pageText.replace(/\s/g, '').length,
    textCoverage: Math.min(1, metrics.textArea / metrics.pageArea),
    imageOperations: metrics.imageOperations,
    numericRows,
    coordinateRows,
    vocabularyHits: surveyVocabularyHits(pageText),
  };
}

async function countImageOperations(
  page: { getOperatorList: () => Promise<{ fnArray: number[] }> },
  pdfjsLib: { OPS?: Record<string, number> },
): Promise<number> {
  try {
    const ops = pdfjsLib.OPS ?? {};
    const paintCodes = new Set(
      Object.entries(ops)
        .filter(([name]) => /^paint(?:Image|Jpeg|InlineImage)/.test(name))
        .map(([, code]) => code),
    );
    if (paintCodes.size === 0) return 0;
    const list = await page.getOperatorList();
    return list.fnArray.reduce((total, code) => total + (paintCodes.has(code) ? 1 : 0), 0);
  } catch {
    // A page whose operator list cannot be read simply contributes no image
    // evidence; it must never abort the extraction.
    return 0;
  }
}

/**
 * Renders one page to a grayscale raster.
 *
 * The canvas backend is the one PDF.js already ships and uses for its own
 * rendering, so nothing new is installed for this. Where that backend is not
 * available — some serverless runtimes have no native bindings — the function
 * returns null and the caller falls back to the text layer rather than failing.
 */
async function renderPdfPageGray(
  pdf: { getPage: (pageNumber: number) => Promise<unknown> },
  pageNumber: number,
): Promise<GrayImage | null> {
  try {
    const canvasModule = await import('@napi-rs/canvas').catch(() => null);
    if (!canvasModule?.createCanvas) return null;
    const page = await pdf.getPage(pageNumber) as unknown as {
      getViewport: (options: { scale: number }) => { width: number; height: number };
      render: (options: Record<string, unknown>) => { promise: Promise<void> };
    };
    const base = page.getViewport({ scale: 1 });
    let scale = RASTER_TARGET_DPI / 72;
    const pixels = base.width * base.height * scale * scale;
    if (pixels > RASTER_MAX_PIXELS) scale = Math.sqrt(RASTER_MAX_PIXELS / (base.width * base.height));
    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));
    const canvas = canvasModule.createCanvas(width, height);
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    await page.render({ canvasContext: context, viewport }).promise;
    return toGray({ width, height, data: context.getImageData(0, 0, width, height).data });
  } catch (error) {
    logger.debug(`PDF page ${pageNumber} could not be rasterised: ${(error as Error).message}`);
    return null;
  }
}

// ── Image path ───────────────────────────────────────────────────────────────

async function processImage(buffer: ArrayBuffer): Promise<OcrResult> {
  const { decodeToGray } = await import('./raster');
  const gray = await decodeToGray(new Uint8Array(buffer));
  if (!gray) return emptyResult();

  const stats = emptyStats();
  stats.pagesInspected = 1;
  stats.pagesRasterized = 1;
  const pool = new OcrWorkerPool();
  const deadline = Date.now() + OCR_POLICY.DOCUMENT_TIMEOUT_MS;
  const languages = chooseOcrLanguages('');
  try {
    const recognition = await recognizePageRaster(
      pool,
      gray,
      1,
      { width: gray.width, height: gray.height },
      languages,
      stats,
      deadline,
    );
    if (!recognition) return emptyResult();

    const quality = buildQuality({
      stats,
      conflictCount: recognition.conflictCount,
      unreadableCells: recognition.unreadableCount,
      lowConfidenceCells: recognition.lowConfidenceCount,
      numericAgreement: recognition.numericAgreement,
      preprocessingUsed: new Set(recognition.applied.map((operation) => operation.operation)),
      ocrPageCount: 1,
      roiCount: recognition.rois.length,
      ocrConfidence: recognition.confidence,
      hadRois: recognition.rois.length > 0,
    });
    logOcrDiagnostics('image', stats, quality);

    return {
      text: recognition.text,
      confidence: recognition.confidence,
      blocks: [],
      positionedItems: recognition.items,
      pageStats: [],
      ocrPages: [{ page: 1, reasons: ['the upload is an image, so it is read as one'] }],
      rois: recognition.rois,
      cellRejections: recognition.cellRejections,
      quality,
      extractedData: extractStructuredData(recognition.text),
    };
  } catch (error) {
    logger.debug(`Image OCR failed: ${(error as Error).message}`);
    return emptyResult();
  } finally {
    await pool.terminateAll();
  }
}

async function processDocx(buffer: ArrayBuffer): Promise<OcrResult> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  const text = result.value;

  return {
    ...emptyResult(),
    text,
    confidence: 0.95,
    blocks: [{ text, confidence: 0.95, bbox: { x0: 0, y0: 0, x1: 100, y1: 100 } }],
    quality: { ...emptyQuality(), overall: 'HIGH' },
    extractedData: extractStructuredData(text),
  };
}

function extractStructuredData(text: string): OcrResult['extractedData'] {
  const data: OcrResult['extractedData'] = {};

  const parcelMatch = text.match(/(?:رقم\s*(?:القطعة|الParcel)|parcel\s*(?:no|number))[\s:]*([A-Z0-9\-\/]+)/i);
  if (parcelMatch) data.parcelNumber = parcelMatch[1].trim();

  const blockMatch = text.match(/(?:رقم\s*(?:البلوك|الBlock)|block\s*(?:no|number))[\s:]*([A-Z0-9\-\/]+)/i);
  if (blockMatch) data.blockNumber = blockMatch[1].trim();

  const areaMatch = text.match(/(?:المساحة|area|المساح)[\s:]*([\d,.]+)\s*(?:م\s*[²2]|sq\.?\s*m|meter)/i);
  if (areaMatch) data.area = parseFloat(areaMatch[1].replace(/,/g, ''));

  const ownerMatch = text.match(/(?:المالك|owner|اسم\s*(?:المالك|الOwner))[\s:]*([^\n,]+)/i);
  if (ownerMatch) data.owner = ownerMatch[1].trim();

  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
  if (dateMatch) data.date = dateMatch[1];

  const coordMatch = text.match(/(\d{1,3}\.\d{3,})\s*[,\s]\s*(\d{1,3}\.\d{3,})/);
  if (coordMatch) {
    data.coordinates = { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
  }

  return data;
}
