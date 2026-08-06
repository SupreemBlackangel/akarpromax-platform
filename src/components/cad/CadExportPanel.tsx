"use client";

import { useCallback, useMemo, useState } from "react";
import type { CadDocumentModel, CadExportFormat, CadExportStatus } from "@/src/lib/cad/types";
import { generateDxf, validateGeneratedDxf } from "@/src/lib/cad/dxf-generator";
import { generateSvg } from "@/src/lib/cad/svg-export";
import { generatePng } from "@/src/lib/cad/image-export";
import { generatePdf, type PdfPaperSize, type PdfOrientation, PAPER_POINTS } from "@/src/lib/cad/pdf-export";
import { hasErrors, validateCadDocument, sanitizeCadDocument } from "@/src/lib/cad/validation";

type Props = {
  document: CadDocumentModel;
  locale?: string;
};

const FORMAT_LABELS: Record<CadExportFormat, Record<string, string>> = {
  dxf: { ar: "DXF (AutoCAD)", en: "DXF (AutoCAD)" },
  svg: { ar: "SVG (متجهي)", en: "SVG (Vector)" },
  png: { ar: "PNG (صورة)", en: "PNG (Image)" },
  pdf: { ar: "PDF (طباعة)", en: "PDF (Print)" },
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function CadExportPanel({ document, locale = "ar" }: Props) {
  const [format, setFormat] = useState<CadExportFormat>("dxf");
  const [paper, setPaper] = useState<PdfPaperSize>("A4");
  const [orientation, setOrientation] = useState<PdfOrientation>("landscape");
  const [status, setStatus] = useState<CadExportStatus>("idle");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ fileName: string; size: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = (ar: string, en: string) => (locale === "ar" ? ar : en);

  const issues = useMemo(() => validateCadDocument(document), [document]);
  const blocked = hasErrors(issues);

  const setStep = useCallback((msg: string) => {
    setProgress(msg);
  }, []);

  const handleExport = useCallback(async () => {
    setStatus("validating");
    setError(null);
    setResult(null);
    const validation = validateCadDocument(document);
    if (hasErrors(validation)) {
      setStatus("failed");
      setError(t("توجد أخطاء في البيانات الهندسية، راجع التحقق قبل التصدير.", "Drawing validation failed, check the validation summary."));
      return;
    }
    setStatus("preparing");
    setStep(t("جارٍ إعداد نموذج الرسم...", "Preparing drawing model..."));
    const clean = sanitizeCadDocument(document);
    const safeName = (document.drawingName || "drawing").replace(/[^\w\u0600-\u06FF-]+/g, "_").slice(0, 60);

    try {
      setStatus("generating");
      let blob: Blob;
      let fileName: string;

      if (format === "dxf") {
        setStep(t("جارٍ توليد ملف DXF...", "Generating DXF file..."));
        const dxf = generateDxf(clean);
        const check = validateGeneratedDxf(dxf);
        if (!check.ok) {
          throw new Error(t("فشل التحقق من ملف DXF.", "DXF integrity check failed."));
        }
        blob = new Blob(["\uFEFF" + dxf], { type: "application/dxf" });
        fileName = `${safeName}.dxf`;
      } else if (format === "svg") {
        setStep(t("جارٍ توليد ملف SVG...", "Generating SVG file..."));
        blob = new Blob([generateSvg(clean)], { type: "image/svg+xml" });
        fileName = `${safeName}.svg`;
      } else if (format === "png") {
        setStep(t("جارٍ توليد ملف PNG...", "Generating PNG image..."));
        blob = await generatePng(clean);
        fileName = `${safeName}.png`;
      } else {
        setStep(t("جارٍ توليد ملف PDF...", "Generating PDF file..."));
        blob = await generatePdf(clean, { paper, orientation });
        fileName = `${safeName}.pdf`;
      }

      if (blob.size === 0) throw new Error(t("الملف الناتج فارغ.", "Generated file is empty."));

      setStatus("converting");
      setStep(t("جارٍ التحقق من سلامة الملف...", "Verifying file integrity..."));
      setStatus("completed");
      setStep(t("تم إنشاء الملف بنجاح.", "File generated successfully."));
      setResult({ fileName, size: blob.size, message: t("تم إنشاء الملف بنجاح.", "File generated successfully.") });
      downloadBlob(blob, fileName);
    } catch (e) {
      setStatus("failed");
      setError(e instanceof Error ? e.message : t("فشل تصدير الملف.", "Export failed."));
    }
  }, [document, format, paper, orientation, t, setStep]);

  const busy = status !== "idle" && status !== "completed" && status !== "failed";

  return (
    <div className="cad-export-panel">
      <div className="cad-export-row">
        <label className="cad-field">
          <span>{t("الصيغة", "Format")}</span>
          <select className="tc-select" value={format} onChange={(e) => setFormat(e.target.value as CadExportFormat)} disabled={busy}>
            {(Object.keys(FORMAT_LABELS) as CadExportFormat[]).map((f) => (
              <option key={f} value={f}>{FORMAT_LABELS[f][locale]}</option>
            ))}
          </select>
        </label>
        {format === "pdf" && (
          <>
            <label className="cad-field">
              <span>{t("الورق", "Paper")}</span>
              <select className="tc-select" value={paper} onChange={(e) => setPaper(e.target.value as PdfPaperSize)} disabled={busy}>
                {(Object.keys(PAPER_POINTS) as PdfPaperSize[]).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="cad-field">
              <span>{t("الاتجاه", "Orientation")}</span>
              <select className="tc-select" value={orientation} onChange={(e) => setOrientation(e.target.value as PdfOrientation)} disabled={busy}>
                <option value="landscape">{t("أفقي", "Landscape")}</option>
                <option value="portrait">{t("عمودي", "Portrait")}</option>
              </select>
            </label>
          </>
        )}
      </div>

      <div className="cad-export-meta">
        <span>{t("العناصر", "Entities")}: {document.entities.length}</span>
        <span>{t("الطبقات", "Layers")}: {document.layers.length}</span>
        <span>{t("الوحدة", "Units")}: {document.units}</span>
      </div>

      {blocked && (
        <div className="cad-export-blocked">
          {t("لن يتم التصدير بسبب أخطاء التحقق.", "Export blocked by validation errors.")}
        </div>
      )}

      {busy && <div className="cad-export-progress">{progress}</div>}
      {error && <div className="cad-export-error">{error}</div>}
      {result && (
        <div className="cad-export-result">
          {result.message} — {result.fileName} ({Math.ceil(result.size / 1024)} KB)
        </div>
      )}

      <button
        type="button"
        className="button-primary cad-export-btn"
        onClick={handleExport}
        disabled={busy || blocked}
      >
        {busy
          ? t("جارٍ المعالجة...", "Processing...")
          : t("إنشاء وتنزيل الملف", "Generate & Download")}
      </button>
    </div>
  );
}
