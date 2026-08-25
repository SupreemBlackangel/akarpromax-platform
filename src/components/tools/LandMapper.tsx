"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/src/types/site";
import { extractCoordinates, extractLandDetails, shoelaceArea, detectUtmZone, type ExtractedPoint } from "@/src/lib/tools/land-analysis";
import { ToolCalculatorShell } from "./ToolCalculatorShell";
import { ToolSecondaryActions } from "./ToolSecondaryActions";

type Props = { locale: Locale };

type Stage = "idle" | "loading" | "ocr" | "extracting" | "done" | "error";

export function LandMapper({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [points, setPoints] = useState<ExtractedPoint[]>([]);
  const [landDetails, setLandDetails] = useState<Record<string, string>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStage("loading");
    setProgress(0);
    setErrorMsg("");
    setOcrText("");
    setPoints([]);
    setLandDetails({});

    try {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      let allText = "";

      if (isImage) {
        setPreviewUrl(URL.createObjectURL(file));
        setStage("ocr");
        setProgress(10);

        const Tesseract = await import("tesseract.js");
        const result = await Tesseract.recognize(file, "ara+eng", {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === "recognizing text") setProgress(20 + Math.round(m.progress * 60));
          },
        });
        const text = result.data.text;
        allText = text;
        setOcrText(text);
        setProgress(80);
      } else if (isPdf) {
        setPreviewUrl(URL.createObjectURL(file));
        setStage("ocr");
        setProgress(10);

        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const maxPages = Math.min(pdf.numPages, 5);
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pageText = (content.items as any[]).filter((it) => it.str).map((it) => it.str as string).join(" ");
          allText += pageText + "\n";
          setProgress(10 + Math.round((i / maxPages) * 30));
        }

        if (allText.replace(/\s/g, "").length < 30) {
          const Tesseract = await import("tesseract.js");
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
            const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
            const result = await Tesseract.recognize(blob, "ara+eng", {
              logger: (m: { status: string; progress: number }) => {
                if (m.status === "recognizing text") setProgress(40 + Math.round((i / maxPages) * 40));
              },
            });
            allText += result.data.text + "\n";
          }
        }
        setOcrText(allText);
        setProgress(80);
      } else {
        throw new Error("Unsupported file type");
      }

      setStage("extracting");
      setProgress(85);

      // `detectUtmZone` reports only what the document states. Without a stated
      // zone, UTM rows are skipped rather than converted against a guess.
      const zone = detectUtmZone(allText || ocrText || "");
      const extracted = extractCoordinates(allText || ocrText || "", zone);
      const details = extractLandDetails(allText || ocrText || "");

      setPoints(extracted);
      setLandDetails(details);
      setStage("done");
      setProgress(100);
    } catch (err) {
      setStage("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage !== "done" || points.length < 3 || !mapRef.current) return;

    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;

      const container = mapRef.current;
      container.innerHTML = "";

      const map = L.map(container, { center: [points[0].lat, points[0].lng], zoom: 17 });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 22,
      }).addTo(map);

      const coords: [number, number][] = points.map((p) => [p.lat, p.lng]);

      L.polygon(coords, { color: "#2563EB", fillColor: "#2563EB", fillOpacity: 0.25, weight: 3 }).addTo(map);

      points.forEach((pt) => {
        L.circleMarker([pt.lat, pt.lng], { radius: 6, color: "#2563EB", fillColor: "#fff", fillOpacity: 1, weight: 2 })
          .bindPopup(`<b>${pt.label}</b><br>${pt.lat.toFixed(6)}, ${pt.lng.toFixed(6)}`)
          .addTo(map);
      });

      map.fitBounds(L.latLngBounds(coords).pad(0.1));
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [stage, points]);

  const areaM2 = points.length >= 3
    ? shoelaceArea(points.map((p) => [p.lng, p.lat]))
    : null;

  const copyText = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  }, []);

  const copyAll = useCallback(() => {
    const text = points.map((pt) => `${pt.label}\t${pt.lat}\t${pt.lng}`).join("\n");
    navigator.clipboard.writeText(text);
  }, [points]);

  const stageLabels: Record<Stage, string> = {
    idle: "",
    loading: locale === "ar" ? "جارٍ تحميل الملف..." : "Loading file...",
    ocr: locale === "ar" ? "جارٍ التعرف على النص بالـ OCR..." : "Running OCR...",
    extracting: locale === "ar" ? "جارٍ استخراج الإحداثيات..." : "Extracting coordinates...",
    done: locale === "ar" ? "تم بنجاح!" : "Done!",
    error: locale === "ar" ? "حدث خطأ" : "Error",
  };

  return (
    <ToolCalculatorShell
      title={locale === "ar" ? "حدد أرضك — MapMyDeed" : "Map My Land — MapMyDeed"}
      subtitle={locale === "ar" ? "ارفع صورة/PDF الصك — يستخرج الإحداثيات تلقائياً ويرسم المضلع على الخريطة" : "Upload deed image/PDF — extracts coordinates and draws polygon on map"}
      dir={dir}
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={stage !== "idle" && stage !== "done" && stage !== "error"}
            className="w-full px-5 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-gray-400 text-white rounded-lg text-sm font-semibold transition-colors min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            {locale === "ar" ? "📁 اختر صورة أو PDF للصك" : "📁 Choose deed image or PDF"}
          </button>
        </div>

        {stage !== "idle" && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700 dark:text-gray-200">{stageLabels[stage]}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-300 ${stage === "error" ? "bg-[var(--color-error-soft)]0" : stage === "done" ? "bg-green-500" : "bg-[var(--color-primary-soft)]0"}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {stage === "error" && (
          <div className="bg-[var(--color-error-soft)] dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4 text-sm">{errorMsg}</div>
        )}

        {stage === "done" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              {previewUrl && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    {locale === "ar" ? "الملف الأصلي" : "Original file"}
                  </h3>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden max-h-64">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="deed" className="w-full object-contain max-h-64" />
                  </div>
                </div>
              )}

              {Object.keys(landDetails).length > 0 && (
                <div className="mb-4 bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    {locale === "ar" ? "بيانات الصك" : "Deed Details"}
                  </h3>
                  <dl className="space-y-1">
                    {landDetails.owner && <><dt className="text-xs text-gray-400">{locale === "ar" ? "المالك" : "Owner"}</dt><dd className="text-sm text-gray-900 dark:text-white">{landDetails.owner}</dd></>}
                    {landDetails.documentNumber && <><dt className="text-xs text-gray-400">{locale === "ar" ? "رقم الوثيقة" : "Doc #"}</dt><dd className="text-sm text-gray-900 dark:text-white">{landDetails.documentNumber}</dd></>}
                    {landDetails.area && <><dt className="text-xs text-gray-400">{locale === "ar" ? "المساحة" : "Area"}</dt><dd className="text-sm text-gray-900 dark:text-white">{landDetails.area} m²</dd></>}
                    {landDetails.city && <><dt className="text-xs text-gray-400">{locale === "ar" ? "المدينة" : "City"}</dt><dd className="text-sm text-gray-900 dark:text-white">{landDetails.city}</dd></>}
                  </dl>
                </div>
              )}

              {points.length > 0 && (
                <div className="bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {locale === "ar" ? "الإحداثيات المستخرجة" : "Extracted coordinates"} ({points.length})
                    </h3>
                    {areaM2 && (
                      <span className="text-xs font-bold text-[var(--color-primary)] dark:text-blue-400">
                        A = {areaM2.toLocaleString(locale === "ar" ? "ar-OM" : "en-US", { maximumFractionDigits: 2 })} m²
                      </span>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 dark:text-gray-400">
                          <th className="text-left py-1">#</th>
                          <th className="text-left py-1">Lat</th>
                          <th className="text-left py-1">Lng</th>
                          <th className="text-left py-1">UTM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {points.map((pt, i) => (
                          <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                            <td className="py-1 font-semibold">{pt.label}</td>
                            <td className="py-1 font-mono">{pt.lat.toFixed(6)}</td>
                            <td className="py-1 font-mono">{pt.lng.toFixed(6)}</td>
                            <td className="py-1 font-mono text-gray-500">
                              {pt.easting ? `${pt.easting.toFixed(1)}E ${pt.northing?.toFixed(1)}N Z${pt.utmZone}` : "—"}
                            </td>
                            <td className="py-1">
                              <button
                                onClick={() => copyText(`${pt.lat}\t${pt.lng}`, i)}
                                className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded"
                                aria-label={`Copy point ${pt.label}`}
                              >
                                {copiedIdx === i ? "✓" : "📋"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {ocrText && (
                <details className="mt-4">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded">
                    {locale === "ar" ? "عرض النص المستخرج من OCR" : "Show OCR extracted text"}
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-60 whitespace-pre-wrap font-mono">
                    {ocrText}
                  </pre>
                </details>
              )}

              {points.length > 0 && (
                <div className="mt-3">
                  <ToolSecondaryActions
                    actions={[
                      { label: locale === "ar" ? "نسخ الكل" : "Copy All", onClick: copyAll },
                    ]}
                  />
                </div>
              )}
            </div>

            <div>
              {points.length >= 3 ? (
                <div ref={mapRef} className="w-full h-[400px] rounded-lg border border-gray-200 dark:border-gray-800" />
              ) : (
                <div className="w-full h-[400px] rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
                  {points.length === 0
                    ? (locale === "ar" ? "لم يتم العثور على إحداثيات — جرّب رفع صورة أوضح" : "No coordinates found — try a clearer image")
                    : (locale === "ar" ? "3 نقاط على الأقل مطلوبة لرسم المضلع" : "At least 3 points needed to draw polygon")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolCalculatorShell>
  );
}
