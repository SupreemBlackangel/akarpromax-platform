"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  PencilLine,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import type { PDFPageProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  groupPdfTextIntoLines,
  hasArabic,
  normalizePdfText,
  splitLinesIntoSegments,
  type PdfTextLine,
  type PositionedPdfText,
} from "@/src/lib/tools/pdf-to-word-layout";
import { ToolCalculatorShell } from "./ToolCalculatorShell";

type Props = { locale: string };
type ConversionMode = "fidelity" | "editable";
type Stage = "idle" | "loading" | "extracting" | "rendering" | "ocr" | "generating" | "done" | "error";

type RenderedPage = {
  png: Uint8Array;
  widthPt: number;
  heightPt: number;
};

type EditablePage = {
  lines: PdfTextLine[];
  widthPt: number;
  heightPt: number;
};

type ConversionSummary = {
  pageCount: number;
  mode: ConversionMode;
};

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PDF_PAGES = 40;
const PDF_RENDER_SCALE = 2.2;
const POINTS_TO_TWIPS = 20;
const POINTS_TO_PIXELS = 96 / 72;

function formatFileSize(bytes: number, arabic: boolean): string {
  const formatter = new Intl.NumberFormat(arabic ? "ar" : "en", { maximumFractionDigits: 1 });
  if (bytes < 1024 * 1024) return `${formatter.format(bytes / 1024)} KB`;
  return `${formatter.format(bytes / (1024 * 1024))} MB`;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("تعذر إنشاء صورة الصفحة"));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}

async function renderPdfPage(page: PDFPageProxy): Promise<RenderedPage> {
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(PDF_RENDER_SCALE, 1800 / Math.max(1, baseViewport.width));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("تعذر تجهيز صفحة PDF");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  const png = await canvasToPng(canvas);
  canvas.width = 1;
  canvas.height = 1;
  return { png, widthPt: baseViewport.width, heightPt: baseViewport.height };
}

async function renderImageFile(file: File): Promise<RenderedPage> {
  const bitmap = await createImageBitmap(file);
  const portrait = bitmap.height >= bitmap.width;
  const widthPt = portrait ? 595.28 : 841.89;
  const heightPt = portrait ? 841.89 : 595.28;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthPt * 2.2);
  canvas.height = Math.round(heightPt * 2.2);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("تعذر قراءة الصورة");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const margin = Math.round(Math.min(canvas.width, canvas.height) * 0.025);
  const scale = Math.min((canvas.width - margin * 2) / bitmap.width, (canvas.height - margin * 2) / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  context.drawImage(bitmap, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  bitmap.close();
  const png = await canvasToPng(canvas);
  canvas.width = 1;
  canvas.height = 1;
  return { png, widthPt, heightPt };
}

function ocrTextToPage(text: string, widthPt: number, heightPt: number): EditablePage {
  const rawLines = text.split(/\r?\n/).map(normalizePdfText).filter(Boolean);
  return {
    widthPt,
    heightPt,
    lines: rawLines.map((line, index) => ({
      y: heightPt - 40 - index * 16,
      height: 12,
      text: line,
      rtl: hasArabic(line),
      blocks: [{ text: line, x: 0, width: widthPt, rtl: hasArabic(line) }],
    })),
  };
}

async function createFidelityDocument(pages: RenderedPage[]): Promise<Blob> {
  const { AlignmentType, Document, ImageRun, Packer, Paragraph, SectionType } = await import("docx");
  const sections = pages.map((page) => {
    const marginPt = 3;
    const imageWidth = Math.max(1, (page.widthPt - marginPt * 2) * POINTS_TO_PIXELS);
    const imageHeight = Math.max(1, (page.heightPt - marginPt * 2) * POINTS_TO_PIXELS);
    return {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: {
            width: Math.round(page.widthPt * POINTS_TO_TWIPS),
            height: Math.round(page.heightPt * POINTS_TO_TWIPS),
          },
          margin: {
            top: marginPt * POINTS_TO_TWIPS,
            right: marginPt * POINTS_TO_TWIPS,
            bottom: marginPt * POINTS_TO_TWIPS,
            left: marginPt * POINTS_TO_TWIPS,
            header: 0,
            footer: 0,
          },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              type: "png",
              data: page.png,
              transformation: { width: imageWidth, height: imageHeight },
              altText: { title: "PDF page", description: "Original PDF page", name: "PDF page" },
            }),
          ],
        }),
      ],
    };
  });

  const output = new Document({
    creator: "AkarProMax",
    title: "PDF to Word - faithful layout",
    description: "Visually faithful PDF conversion",
    sections,
  });
  return Packer.toBlob(output);
}

function isHeadingLine(line: PdfTextLine, medianHeight: number): boolean {
  return line.height >= medianHeight * 1.16 || /^[\s]*(?:[0-9٠-٩]+\s*[-–—.:]|نطاق العمل)/u.test(line.text);
}

async function createEditableDocument(pages: EditablePage[]): Promise<Blob> {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Packer,
    Paragraph,
    SectionType,
    ShadingType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
  } = await import("docx");

  const sections = pages.map((page) => {
    const lineHeights = page.lines.map((line) => line.height).sort((a, b) => a - b);
    const medianHeight = lineHeights[Math.floor(lineHeights.length / 2)] ?? 11;
    const children: Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> = [];

    for (const segment of splitLinesIntoSegments(page.lines, page.widthPt)) {
      if (segment.kind === "text") {
        for (const line of segment.lines) {
          const heading = isHeadingLine(line, medianHeight);
          children.push(new Paragraph({
            alignment: line.rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            bidirectional: line.rtl,
            keepNext: heading,
            spacing: { before: heading ? 120 : 0, after: heading ? 120 : 70 },
            children: [new TextRun({
              text: line.text,
              font: "Arial",
              size: heading ? 28 : 22,
              bold: heading,
              boldComplexScript: heading,
              color: heading ? "087F6B" : "182235",
              rightToLeft: line.rtl,
              language: line.rtl ? { bidirectional: "ar-SA" } : { value: "en-US" },
            })],
          }));
        }
        continue;
      }

      const frequencies = new Map<number, number>();
      for (const line of segment.lines) frequencies.set(line.blocks.length, (frequencies.get(line.blocks.length) ?? 0) + 1);
      const columnCount = Math.max(3, Math.min(7, [...frequencies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 3));
      const rows = segment.lines.map((line, rowIndex) => {
        const bins = Array.from({ length: columnCount }, () => [] as typeof line.blocks);
        for (const block of line.blocks) {
          const center = block.x + block.width / 2;
          const sourceIndex = Math.max(0, Math.min(columnCount - 1, Math.floor((center / page.widthPt) * columnCount)));
          bins[sourceIndex].push(block);
        }
        const cells = [...bins].reverse().map((blocks) => {
          const rtl = blocks.some((block) => block.rtl);
          const text = normalizePdfText(
            [...blocks]
              .sort((a, b) => (rtl ? b.x - a.x : a.x - b.x))
              .map((block) => block.text)
              .join(" "),
          );
          return new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            shading: rowIndex === 0 ? { fill: "EAF4F2", type: ShadingType.CLEAR, color: "auto" } : undefined,
            margins: { top: 70, right: 80, bottom: 70, left: 80 },
            children: [new Paragraph({
              alignment: rtl ? AlignmentType.RIGHT : AlignmentType.CENTER,
              bidirectional: rtl,
              spacing: { before: 0, after: 0 },
              children: [new TextRun({
                text,
                font: "Arial",
                size: 19,
                bold: rowIndex === 0,
                boldComplexScript: rowIndex === 0,
                rightToLeft: rtl,
                language: rtl ? { bidirectional: "ar-SA" } : { value: "en-US" },
              })],
            })],
          });
        });
        return new TableRow({ children: cells, cantSplit: true });
      });

      const border = { style: BorderStyle.SINGLE, size: 2, color: "C8D3DF" };
      children.push(new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        alignment: AlignmentType.CENTER,
        visuallyRightToLeft: true,
        borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
      }));
      children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
    }

    if (children.length === 0) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "لم يتم العثور على نص في هذه الصفحة", font: "Arial", color: "8A94A6" })],
      }));
    }

    return {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: {
            width: Math.round(page.widthPt * POINTS_TO_TWIPS),
            height: Math.round(page.heightPt * POINTS_TO_TWIPS),
          },
          margin: { top: 600, right: 600, bottom: 600, left: 600, header: 0, footer: 0 },
        },
      },
      children,
    };
  });

  const output = new Document({
    creator: "AkarProMax",
    title: "PDF to Word - editable text",
    description: "Editable PDF text conversion with Arabic RTL support",
    styles: {
      default: {
        document: { run: { font: "Arial", size: 22 }, paragraph: { spacing: { after: 70 } } },
      },
    },
    sections,
  });
  return Packer.toBlob(output);
}

export function PdfToWord({ locale }: Props) {
  const arabic = locale === "ar";
  const dir = arabic ? "rtl" : "ltr";
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ConversionMode>("fidelity");
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<ConversionSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const busy = !["idle", "done", "error"].includes(stage);

  useEffect(() => () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  const resetResult = useCallback(() => {
    setDownloadUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setSummary(null);
    setErrorMsg("");
    setProgress(0);
    setStage("idle");
  }, []);

  const selectFile = useCallback((file: File | undefined) => {
    if (!file) return;
    const validType = file.type === "application/pdf" || file.type.startsWith("image/") || /\.pdf$/i.test(file.name);
    if (!validType) {
      setStage("error");
      setErrorMsg(arabic ? "اختر ملف PDF أو صورة بصيغة PNG أو JPG أو WebP." : "Choose a PDF, PNG, JPG, or WebP file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setStage("error");
      setErrorMsg(arabic ? "حجم الملف يتجاوز الحد الأقصى البالغ 25 ميجابايت." : "The file exceeds the 25 MB limit.");
      return;
    }
    resetResult();
    setSelectedFile(file);
  }, [arabic, resetResult]);

  const removeFile = useCallback(() => {
    resetResult();
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [resetResult]);

  const convert = useCallback(async () => {
    if (!selectedFile || busy) return;
    resetResult();
    setStage("loading");
    setProgress(3);

    try {
      const isPdf = selectedFile.type === "application/pdf" || /\.pdf$/i.test(selectedFile.name);
      let pageCount = 1;
      let outputBlob: Blob;

      if (!isPdf) {
        if (mode === "fidelity") {
          setStage("rendering");
          setProgress(35);
          const page = await renderImageFile(selectedFile);
          setStage("generating");
          setProgress(82);
          outputBlob = await createFidelityDocument([page]);
        } else {
          setStage("ocr");
          setProgress(18);
          const Tesseract = await import("tesseract.js");
          const result = await Tesseract.recognize(selectedFile, "ara+eng", {
            logger: (message: { status: string; progress: number }) => {
              if (message.status === "recognizing text") setProgress(20 + Math.round(message.progress * 55));
            },
          });
          const page = ocrTextToPage(result.data.text, 595.28, 841.89);
          setStage("generating");
          setProgress(82);
          outputBlob = await createEditableDocument([page]);
        }
      } else {
        const pdfjs = await import("pdfjs-dist/webpack.mjs");
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await selectedFile.arrayBuffer()) });
        const pdf = await loadingTask.promise;
        pageCount = pdf.numPages;
        if (pageCount > MAX_PDF_PAGES) {
          await loadingTask.destroy();
          throw new Error(arabic ? `الملف يحتوي على ${pageCount} صفحة. الحد الحالي ${MAX_PDF_PAGES} صفحة لكل عملية.` : `This file has ${pageCount} pages. The current limit is ${MAX_PDF_PAGES} pages per conversion.`);
        }

        if (mode === "fidelity") {
          const pages: RenderedPage[] = [];
          setStage("rendering");
          for (let index = 1; index <= pageCount; index++) {
            const page = await pdf.getPage(index);
            pages.push(await renderPdfPage(page));
            page.cleanup();
            setProgress(8 + Math.round((index / pageCount) * 72));
          }
          setStage("generating");
          setProgress(84);
          outputBlob = await createFidelityDocument(pages);
        } else {
          const pages: EditablePage[] = [];
          let Tesseract: typeof import("tesseract.js") | null = null;
          setStage("extracting");
          for (let index = 1; index <= pageCount; index++) {
            const page = await pdf.getPage(index);
            const viewport = page.getViewport({ scale: 1 });
            const content = await page.getTextContent();
            const items: PositionedPdfText[] = content.items.flatMap((item) => {
              if (!("str" in item) || !item.str.trim()) return [];
              return [{
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height || Math.abs(item.transform[3]) || 10,
                direction: item.dir,
                fontName: item.fontName,
              }];
            });
            const extractedCharacters = items.reduce((sum, item) => sum + item.text.replace(/\s/g, "").length, 0);

            if (extractedCharacters < 20) {
              setStage("ocr");
              const rendered = await renderPdfPage(page);
              Tesseract ??= await import("tesseract.js");
              const pngBuffer = rendered.png.buffer.slice(
                rendered.png.byteOffset,
                rendered.png.byteOffset + rendered.png.byteLength,
              ) as ArrayBuffer;
              const result = await Tesseract.recognize(new Blob([pngBuffer], { type: "image/png" }), "ara+eng");
              pages.push(ocrTextToPage(result.data.text, viewport.width, viewport.height));
            } else {
              pages.push({
                widthPt: viewport.width,
                heightPt: viewport.height,
                lines: groupPdfTextIntoLines(items),
              });
            }
            page.cleanup();
            setProgress(8 + Math.round((index / pageCount) * 68));
            if (index < pageCount) setStage("extracting");
          }
          setStage("generating");
          setProgress(82);
          outputBlob = await createEditableDocument(pages);
        }
        await loadingTask.destroy();
      }

      const url = URL.createObjectURL(outputBlob);
      setDownloadUrl(url);
      setSummary({ pageCount, mode });
      setStage("done");
      setProgress(100);
    } catch (error) {
      setStage("error");
      setErrorMsg(error instanceof Error ? error.message : (arabic ? "تعذر تحويل الملف." : "The file could not be converted."));
    }
  }, [arabic, busy, mode, resetResult, selectedFile]);

  const stageLabels: Record<Stage, string> = {
    idle: "",
    loading: arabic ? "قراءة الملف والتحقق منه..." : "Reading and validating the file...",
    extracting: arabic ? "تحليل ترتيب النص والأسطر والجداول..." : "Analyzing text, lines, and tables...",
    rendering: arabic ? "تثبيت شكل الصفحات بدقة عالية..." : "Capturing pages at high fidelity...",
    ocr: arabic ? "التعرف على النص في الصفحات المصورة..." : "Recognizing text in scanned pages...",
    generating: arabic ? "إنشاء مستند Word والتحقق من الصفحات..." : "Building the Word document...",
    done: arabic ? "اكتمل التحويل" : "Conversion complete",
    error: arabic ? "لم يكتمل التحويل" : "Conversion failed",
  };

  const outputName = selectedFile ? selectedFile.name.replace(/\.[^.]+$/, "") + (mode === "fidelity" ? " - مطابق.docx" : " - قابل للتحرير.docx") : "document.docx";

  return (
    <ToolCalculatorShell
      title={arabic ? "تحويل PDF إلى Word" : "PDF to Word"}
      subtitle={arabic ? "اختر بين مطابقة الشكل أو تحرير النص — مع توضيح النتيجة قبل التحويل" : "Choose visual fidelity or editable text, with a clear result before conversion"}
      dir={dir}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={arabic ? "نوع التحويل" : "Conversion mode"}>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "fidelity"}
            disabled={busy}
            onClick={() => { setMode("fidelity"); resetResult(); }}
            className={`rounded-2xl border p-4 text-start transition-all ${mode === "fidelity" ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm ring-1 ring-blue-600 dark:bg-blue-950/30" : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/30 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]"}`}
          >
            <span className="mb-3 flex items-center justify-between gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${mode === "fidelity" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-background)] text-[var(--color-text-secondary)] dark:bg-[var(--color-surface)]"}`}><LayoutTemplate className="h-5 w-5" /></span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-[var(--color-success)] dark:bg-emerald-950/50 dark:text-emerald-300">{arabic ? "موصى به" : "Recommended"}</span>
            </span>
            <span className="block text-sm font-bold text-[var(--color-text-primary)] dark:text-white">{arabic ? "مطابقة شكل الملف" : "Match the original look"}</span>
            <span className="mt-1.5 block text-xs leading-5 text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">{arabic ? "يحفظ الجداول والألوان والمحاذاة والصفحات كما تظهر في PDF. النص داخل الصفحات غير قابل للتحرير." : "Preserves tables, colors, alignment, and page layout. Text inside the pages is not editable."}</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={mode === "editable"}
            disabled={busy}
            onClick={() => { setMode("editable"); resetResult(); }}
            className={`rounded-2xl border p-4 text-start transition-all ${mode === "editable" ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm ring-1 ring-blue-600 dark:bg-blue-950/30" : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/30 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]"}`}
          >
            <span className="mb-3 flex items-center justify-between gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${mode === "editable" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-background)] text-[var(--color-text-secondary)] dark:bg-[var(--color-surface)]"}`}><PencilLine className="h-5 w-5" /></span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-[var(--accent)] dark:bg-amber-950/50 dark:text-[var(--accent)]">{arabic ? "تنسيق تقريبي" : "Approximate layout"}</span>
            </span>
            <span className="block text-sm font-bold text-[var(--color-text-primary)] dark:text-white">{arabic ? "نص قابل للتحرير" : "Editable text"}</span>
            <span className="mt-1.5 block text-xs leading-5 text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">{arabic ? "يعيد بناء الأسطر واتجاه العربية والجداول الممكن اكتشافها. قد يختلف التخطيط عن PDF المعقد." : "Rebuilds lines, Arabic RTL, and detectable tables. Complex layouts may differ from the PDF."}</span>
          </button>
        </div>

        <div
          className={`rounded-2xl border-2 border-dashed p-6 transition-colors ${selectedFile ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/50 dark:border-blue-900 dark:bg-blue-950/20" : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-blue-400 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]/60"}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); if (!busy) selectFile(event.dataTransfer.files?.[0]); }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.bmp"
            onChange={(event) => selectFile(event.target.files?.[0])}
            className="hidden"
          />
          {selectedFile ? (
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm dark:bg-[var(--color-surface)]">
                {selectedFile.type.startsWith("image/") ? <ImageIcon className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[var(--color-text-primary)] dark:text-white">{selectedFile.name}</span>
                <span className="mt-1 block text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">{formatFileSize(selectedFile.size, arabic)} · {mode === "fidelity" ? (arabic ? "مطابقة الشكل" : "Visual fidelity") : (arabic ? "نص قابل للتحرير" : "Editable text")}</span>
              </span>
              <button type="button" onClick={removeFile} disabled={busy} aria-label={arabic ? "إزالة الملف" : "Remove file"} className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-red-600 disabled:opacity-40 dark:hover:bg-[var(--color-surface)]"><X className="h-5 w-5" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-sm"><UploadCloud className="h-6 w-6" /></span>
              <span className="text-sm font-bold text-[var(--color-text-primary)] dark:text-white">{arabic ? "اسحب الملف هنا أو اضغط للاختيار" : "Drop a file here or click to browse"}</span>
              <span className="mt-1 text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">PDF · PNG · JPG · WebP · {arabic ? "حتى 25 ميجابايت" : "up to 25 MB"}</span>
            </button>
          )}
        </div>

        {selectedFile && !busy && stage !== "done" && (
          <button type="button" onClick={convert} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2">
            {mode === "fidelity" ? <LayoutTemplate className="h-5 w-5" /> : <PencilLine className="h-5 w-5" />}
            {arabic ? "ابدأ التحويل" : "Start conversion"}
          </button>
        )}

        {stage !== "idle" && stage !== "done" && stage !== "error" && (
          <div className="rounded-2xl border border-blue-100 bg-[var(--color-surface)] p-4 shadow-sm dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]" aria-live="polite">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] dark:text-[var(--color-surface-muted)]"><Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />{stageLabels[stage]}</span>
              <span className="text-xs font-bold text-[var(--color-primary)]">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-background)] dark:bg-[var(--color-surface)]"><div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300" style={{ width: `${progress}%` }} /></div>
          </div>
        )}

        {stage === "error" && (
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-error)]/30 bg-[var(--color-error-soft)] p-4 text-sm text-[var(--color-error)] dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" role="alert">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span><span className="mb-1 block font-bold">{stageLabels.error}</span>{errorMsg}</span>
          </div>
        )}

        {stage === "done" && downloadUrl && summary && (
          <div className="rounded-2xl border border-emerald-200 bg-[var(--color-success-soft)] p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[var(--color-success)]" />
              <div className="flex-1">
                <p className="font-bold text-emerald-900 dark:text-emerald-200">{arabic ? `تم إنشاء ${summary.pageCount} صفحة في Word` : `${summary.pageCount} Word page(s) created`}</p>
                <p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-300">{summary.mode === "fidelity" ? (arabic ? "تم حفظ الشكل الكامل للصفحات. المحتوى داخل كل صفحة ثابت للحفاظ على المطابقة." : "The full page appearance is preserved; page content is fixed for fidelity.") : (arabic ? "النص قابل للتحرير مع إعادة بناء تقريبية للأسطر والجداول." : "Text is editable with an approximate reconstruction of lines and tables.")}</p>
              </div>
            </div>
            <a href={downloadUrl} download={outputName} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-success)] px-5 py-3 text-sm font-bold !text-white shadow-sm transition-colors hover:bg-[var(--color-success)]/80"><Download className="h-5 w-5" />{arabic ? "تنزيل ملف Word" : "Download Word file"}</a>
          </div>
        )}

        <div className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-text-secondary)] sm:grid-cols-3 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-text-muted)]">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-[var(--color-success)]" />{arabic ? "المعالجة داخل جهازك" : "Processed on your device"}</span>
          <span className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />{arabic ? `حتى ${MAX_PDF_PAGES} صفحة PDF` : `Up to ${MAX_PDF_PAGES} PDF pages`}</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-violet-600" />{arabic ? "دعم العربية واتجاه RTL" : "Arabic and RTL support"}</span>
        </div>
      </div>
    </ToolCalculatorShell>
  );
}
