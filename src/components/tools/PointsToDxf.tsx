"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Upload,
} from "lucide-react";
import { ToolFileDropzone } from "@/src/components/cad/ToolFileDropzone";
import {
  generateSurveyPointsDxf,
  outputDxfName,
  parseSurveyPoints,
} from "@/src/lib/tools/points-to-dxf";
import { ToolCalculatorShell } from "./ToolCalculatorShell";

type Props = { locale: string };

const SAMPLE_POINTS = [
  "1 437000.000 2606000.000 50.000 BM",
  "2 437050.000 2606020.000 50.500 BLD",
  "3 437100.000 2605980.000 49.800 ROAD",
].join("\n");

function downloadText(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

export function PointsToDxf({ locale }: Props) {
  const isArabic = locale === "ar";
  const dir = isArabic ? "rtl" : "ltr";
  const t = useCallback((ar: string, en: string) => (isArabic ? ar : en), [isArabic]);
  const [content, setContent] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [readError, setReadError] = useState("");
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem("dxf_points");
        if (!raw) return;
        window.localStorage.removeItem("dxf_points");
        const stored = JSON.parse(raw) as Array<{ id?: string; name?: string; x: number; y: number; z?: number; code?: string }>;
        if (!Array.isArray(stored) || stored.length === 0) return;
        setContent(stored.map((point, index) => [
          point.id ?? point.name ?? index + 1,
          point.x,
          point.y,
          point.z ?? 0,
          point.code ?? "",
        ].join(" ").trim()).join("\n"));
        setSourceName("survey_points.txt");
      } catch {
        window.localStorage.removeItem("dxf_points");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const parsed = useMemo(() => parseSurveyPoints(content), [content]);
  const codeGroups = useMemo(() => {
    const groups = new Map<string, number>();
    parsed.points.forEach((point) => {
      if (point.code) groups.set(point.code, (groups.get(point.code) ?? 0) + 1);
    });
    return [...groups.entries()];
  }, [parsed.points]);

  const handleFiles = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setSourceName(file.name);
    setReadError("");
    setDownloaded(false);
    const reader = new FileReader();
    reader.onload = (event) => setContent(String(event.target?.result ?? ""));
    reader.onerror = () => setReadError(t("تعذر قراءة الملف. جرّب حفظه بصيغة TXT أو CSV.", "The file could not be read. Save it as TXT or CSV and try again."));
    reader.readAsText(file);
  }, [t]);

  const reset = useCallback(() => {
    setContent("");
    setSourceName("");
    setReadError("");
    setDownloaded(false);
  }, []);

  const downloadDxf = useCallback(() => {
    if (parsed.points.length === 0) return;
    downloadText(generateSurveyPointsDxf(parsed.points), outputDxfName(sourceName));
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2_500);
  }, [parsed.points, sourceName]);

  return (
    <ToolCalculatorShell
      title={t("تحويل نقاط المساحة إلى DXF", "Convert Survey Points to DXF")}
      subtitle={t(
        "ارفع ملف النقاط، وسننشئ رسمًا مساحيًا بطبقات منظمة وجاهزًا للاستخدام في أوتوكاد.",
        "Upload survey points in N, X, Y, Z, Code order to create a layered AutoCAD-ready DXF.",
      )}
      dir={dir}
    >
      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--color-text-primary)]">
              <FileSpreadsheet className="text-[var(--color-primary)]" size={18} />
              {t("صيغة ملف النقاط", "Points file format")}
            </div>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
            <div>
              <p className="text-sm font-bold text-[var(--color-text-secondary)]">{t("ترتيب الأعمدة المطلوب:", "Required column order:")}</p>
              <div className="mt-2 flex flex-wrap gap-2" dir="ltr">
                {["N", "X", "Y", "Z", "Code"].map((column, index) => (
                  <span key={column} className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-3 py-1.5 font-mono text-xs font-black text-blue-800">
                    {index + 1}. {column}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <span>{t("الصيغ المدعومة:", "Supported formats:")}</span>
                <span dir="ltr" className="font-mono font-bold text-[var(--color-text-secondary)]">TXT · CSV · XYZ · DAT · PTS · NE0</span>
              </div>
              <p className="mt-1 text-xs leading-6 text-[var(--color-text-muted)]">
                {t("يمكن فصل الأعمدة بمسافة أو فاصلة أو مفتاح الجدولة.", "Columns may be separated by spaces, commas or tabs.")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setContent(SAMPLE_POINTS); setSourceName("survey_points.txt"); setReadError(""); }}
              className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-blue-400 hover:text-[var(--color-primary)]"
            >
              {t("استخدام مثال", "Use sample")}
            </button>
          </div>
        </section>

        <ToolFileDropzone
          accept={[".txt", ".csv", ".xyz", ".dat", ".pts", ".ne0", ".tsv"]}
          maxFiles={1}
          maxSizeMB={50}
          locale={locale}
          onFiles={handleFiles}
          label={t("اسحب ملف النقاط هنا أو اضغط لاختياره", "Drop the points file here or click to browse")}
        />

        {sourceName && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-[var(--color-primary-soft)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--color-text-primary)]">
              <Upload size={17} className="shrink-0" />
              <span className="truncate" dir="auto">{sourceName}</span>
            </div>
            <button type="button" onClick={reset} className="flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-surface)] px-3 text-xs font-bold text-[var(--color-text-secondary)] shadow-sm hover:text-red-600">
              <RotateCcw size={15} /> {t("مسح", "Clear")}
            </button>
          </div>
        )}

        <div>
          <label htmlFor="survey-points-text" className="mb-2 block text-sm font-black text-[var(--color-text-primary)]">
            {t("أو الصق النقاط مباشرة", "Or paste points directly")}
          </label>
          <textarea
            id="survey-points-text"
            value={content}
            onChange={(event) => { setContent(event.target.value); setDownloaded(false); }}
            rows={7}
            dir="ltr"
            spellCheck={false}
            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 font-mono text-sm leading-7 text-emerald-300 outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-soft)]"
            placeholder={SAMPLE_POINTS}
          />
        </div>

        {readError && (
          <div className="flex items-start gap-2 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error-soft)] p-4 text-sm font-bold text-[var(--color-error)]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" /> {readError}
          </div>
        )}

        {content.trim() && parsed.points.length === 0 && !readError && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-[var(--accent-soft)] p-4 text-sm font-bold text-amber-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            {t("لم يتم العثور على نقاط صالحة. تأكد أن كل سطر يحتوي على N ثم X ثم Y ثم Z.", "No valid points were found. Check that each row contains N, X, Y and Z.")}
          </div>
        )}

        {parsed.points.length > 0 && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-emerald-200 bg-[var(--color-success-soft)] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                  <div>
                    <p className="font-black text-emerald-950">
                      {t(
                        `تمت قراءة ${parsed.points.length} ${parsed.points.length === 1 ? "نقطة" : "نقاط"} بنجاح`,
                        `${parsed.points.length} points parsed successfully`,
                      )}
                    </p>
                    {parsed.skippedLines > 0 && (
                      <p className="mt-1 text-xs font-semibold text-[var(--accent)]">
                        {t(`تم تخطي ${parsed.skippedLines} سطر غير صالح`, `${parsed.skippedLines} invalid rows skipped`)}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[var(--color-success)]">{t("طبقات الملف المساحية:", "Survey layers:")}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5" dir="ltr">
                      {["CROSS", "NAME", "ELEV", "CODE"].map((layer) => (
                        <span key={layer} className="rounded-md border border-emerald-200 bg-[var(--color-surface)]/70 px-2 py-1 font-mono text-[11px] font-bold text-emerald-800">
                          {layer}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadDxf}
                  className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[var(--color-primary-hover)] active:scale-[0.98]"
                >
                  {downloaded ? <CheckCircle2 size={18} /> : <Download size={18} />}
                  {downloaded
                    ? t("تم تنزيل الملف", "File downloaded")
                    : isArabic
                      ? <>تنزيل ملف <bdi dir="ltr">DXF</bdi></>
                      : "Download DXF"}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
                <h3 className="text-sm font-black text-[var(--color-text-primary)]">{t("معاينة النقاط", "Points preview")}</h3>
                <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                  {t(`عرض ${Math.min(parsed.points.length, 100)} من ${parsed.points.length}`, `Showing ${Math.min(parsed.points.length, 100)} of ${parsed.points.length}`)}
                </span>
              </div>
              <div className="max-h-96 overflow-auto" dir="ltr">
                <table className="w-full min-w-[700px] border-collapse text-left font-mono text-xs" dir="ltr">
                  <thead className="sticky top-0 z-10 bg-[var(--color-surface)] text-white">
                    <tr>
                      {["N", "X / Easting", "Y / Northing", "Z / Elevation", "Code"].map((heading) => (
                        <th key={heading} className="px-4 py-3 font-bold">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsed.points.slice(0, 100).map((point, index) => (
                      <tr key={`${point.sourceLine}-${index}`} className="hover:bg-[var(--color-primary-soft)]/60">
                        <td className="px-4 py-2.5 font-black text-[var(--color-text-primary)]">{point.name || "—"}</td>
                        <td className="px-4 py-2.5 text-[var(--color-primary)]">{point.x.toFixed(3)}</td>
                        <td className="px-4 py-2.5 text-[var(--color-success)]">{point.y.toFixed(3)}</td>
                        <td className="px-4 py-2.5 text-[var(--accent)]">{point.z.toFixed(3)}</td>
                        <td className="px-4 py-2.5 font-bold text-purple-700">{point.code || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {codeGroups.length > 0 && (
              <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5">
                <p className="text-xs font-black text-[var(--color-text-secondary)]">{t("رموز النقاط", "Point codes")}</p>
                <div className="mt-3 flex flex-wrap gap-2" dir="ltr">
                  {codeGroups.map(([code, count]) => (
                    <span key={code} className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 font-mono text-xs font-bold text-purple-800">
                      {code} ({count})
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </ToolCalculatorShell>
  );
}
