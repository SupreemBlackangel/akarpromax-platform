"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/src/types/site";
import { ToolCalculatorShell } from "./ToolCalculatorShell";
import { ToolSecondaryActions } from "./ToolSecondaryActions";

type Props = { locale: Locale };

type Stage = "idle" | "loading" | "ocr" | "resolving" | "done" | "error";

type ResolveResponse = {
  id: string;
  status: string;
  center?: { lat: number; lon: number };
  geometry?: { type: string; coordinates: { lat: number; lon: number }[] };
  locationConfidence?: string;
  boundaryConfidence?: string;
  crsConfidence?: string;
  resolvedAddress?: string;
  parcelIdentifiers?: { parcelId?: string; planId?: string; plotId?: string };
  warnings?: string[];
  steps?: string[];
  evidence?: {
    coordinatePairs?: { lat: number; lon: number }[];
  };
  extraction?: { ocrUsed?: boolean; aiUsed?: boolean; geocodingUsed?: boolean };
  document?: { category?: string };
};

type SavedLand = { id: string };

type Surveyor = {
  id: string;
  name: string;
  isVerified?: boolean;
  reputationLevel?: string;
  ratingAvg?: number;
  jobsCompleted?: number;
  distanceKm?: number;
};

const STATUS_LABELS: Record<string, { ar: string; en: string; tr: string; tone: "ok" | "warn" | "bad" }> = {
  RESOLVED_EXPLICIT_COORDINATES: { ar: "تم تحديد الموقع من الإحداثيات", en: "Located from explicit coordinates", tr: "Koordinatlardan konum belirlendi", tone: "ok" },
  RESOLVED_GEOCODED: { ar: "تم تحديد الموقع عبر الترميز الجغرافي", en: "Located via geocoding", tr: "Coğrafi kodlama ile konumlandı", tone: "ok" },
  NEEDS_USER_CONFIRMATION: { ar: "يحتاج تأكيد المستخدم", en: "Needs user confirmation", tr: "Kullanıcı onayı gerekli", tone: "warn" },
  PARTIALLY_RESOLVED: { ar: "تحديد جزئي", en: "Partially resolved", tr: "Kısmen belirlendi", tone: "warn" },
  UNRESOLVED: { ar: "لم يتم التحديد", en: "Unresolved", tr: "Belirlenemedi", tone: "bad" },
  INVALID_DOCUMENT: { ar: "وثيقة غير صالحة", en: "Invalid document", tr: "Geçersiz belge", tone: "bad" },
  NOT_LAND_DOCUMENT: { ar: "ليست وثيقة أرض", en: "Not a land document", tr: "Arazi belgesi değil", tone: "bad" },
};

const CONFIDENCE_LABELS: Record<string, { ar: string; en: string }> = {
  HIGH: { ar: "عالي", en: "High" },
  MEDIUM: { ar: "متوسط", en: "Medium" },
  LOW: { ar: "منخفض", en: "Low" },
  UNRESOLVED: { ar: "غير محدد", en: "Unresolved" },
  DETECTED: { ar: "مؤكد", en: "Detected" },
  PROBABLE: { ar: "مرجّح", en: "Probable" },
  AMBIGUOUS: { ar: "غامض", en: "Ambiguous" },
  UNKNOWN: { ar: "غير معروف", en: "Unknown" },
};

export function FindMyLand({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [savedLand, setSavedLand] = useState<SavedLand | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [directionsUrl, setDirectionsUrl] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [listingDraft, setListingDraft] = useState<string | null>(null);
  const [surveyors, setSurveyors] = useState<Surveyor[] | null>(null);
  const [surveyorLoading, setSurveyorLoading] = useState(false);
  const [quoteSentId, setQuoteSentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const t = useCallback(
    (ar: string, en: string, tr: string) => {
      if (locale === "ar") return ar;
      if (locale === "tr") return tr;
      return en;
    },
    [locale],
  );

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setStage("loading");
      setProgress(0);
      setErrorMsg("");
      setOcrText("");
      setResult(null);
      setSavedLand(null);
      setShareUrl("");
      setDirectionsUrl("");
      setQrPayload("");
      setListingDraft(null);
      setSurveyors(null);
      setQuoteSentId(null);
      setActionError("");

      try {
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf";
        let nativeText = "";
        let extractedOcr = "";

        if (isImage) {
          setPreviewUrl(URL.createObjectURL(file));
          setStage("ocr");
          setProgress(10);
          const Tesseract = await import("tesseract.js");
          const ocr = await Tesseract.recognize(file, "ara+eng", {
            logger: (m: { status: string; progress: number }) => {
              if (m.status === "recognizing text") setProgress(20 + Math.round(m.progress * 60));
            },
          });
          extractedOcr = ocr.data.text;
          setOcrText(extractedOcr);
          setProgress(80);
        } else if (isPdf) {
          setPreviewUrl(URL.createObjectURL(file));
          setStage("ocr");
          setProgress(10);
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let allText = "";
          const maxPages = Math.min(pdf.numPages, 5);
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pageText = (content.items as any[]).filter((it) => it.str).map((it) => it.str as string).join(" ");
            allText += pageText + "\n";
            setProgress(10 + Math.round((i / maxPages) * 30));
          }
          nativeText = allText;
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
              const ocr = await Tesseract.recognize(blob, "ara+eng", {
                logger: (m: { status: string; progress: number }) => {
                  if (m.status === "recognizing text") setProgress(40 + Math.round((i / maxPages) * 40));
                },
              });
              extractedOcr += ocr.data.text + "\n";
            }
          }
          setOcrText(extractedOcr || nativeText);
          setProgress(80);
        } else {
          throw new Error("Unsupported file type");
        }

        setStage("resolving");
        setProgress(85);

        const res = await fetch("/api/land/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            nativeText: nativeText || undefined,
            ocrText: extractedOcr || undefined,
          }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const data = (await res.json()) as ResolveResponse;
        setResult(data);
        setStage("done");
        setProgress(100);
      } catch (err) {
        setStage("error");
        setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [],
  );

  useEffect(() => {
    if (stage !== "done" || !result?.center || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;
      const container = mapRef.current;
      container.innerHTML = "";
      const center: [number, number] = [result.center!.lat, result.center!.lon];
      const map = L.map(container, { center, zoom: 15 });
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 22,
      }).addTo(map);
      L.marker(center, { title: result.resolvedAddress }).addTo(map);

      const coords: [number, number][] = [center];
      const pts = result.geometry?.coordinates ?? result.evidence?.coordinatePairs ?? [];
      if (pts.length >= 3) {
        const polygonCoords: [number, number][] = pts.map((p) => [p.lat, p.lon]);
        L.polygon(polygonCoords, { color: "#2563EB", fillColor: "#2563EB", fillOpacity: 0.25, weight: 3 }).addTo(map);
        coords.push(...polygonCoords);
      }
      map.fitBounds(L.latLngBounds(coords).pad(0.3));
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [stage, result]);

  const handleSaveLand = useCallback(async () => {
    if (!result?.center) return;
    setActionError("");
    try {
      const ownerId = localStorage.getItem("ap_owner_id") || "guest";
      const res = await fetch("/api/land", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId,
          title: result.parcelIdentifiers?.planId
            ? t("أرضي — صك", "My Land — Deed", "Arazim — Tapu")
            : t("أرضي — موقع محدد", "My Land — Located", "Arazim — Konum"),
          location: {
            point: result.center,
            geometry: result.geometry,
            label: result.resolvedAddress,
          },
          reference: result.parcelIdentifiers,
          source: result.status === "RESOLVED_GEOCODED" ? "geocoding" : "coordinates",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as SavedLand;
      if (!data.id) throw new Error("save failed");
      setSavedLand(data);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "save failed");
    }
  }, [result, t]);

  const handleShare = useCallback(
    async (mode: "directions" | "map" | "listing") => {
      if (!savedLand) return;
      setActionError("");
      try {
        const res = await fetch(`/api/land/${savedLand.id}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: mode === "map" ? undefined : mode }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { url?: string; qrPayload?: string; draft?: string };
        if (mode === "directions") setDirectionsUrl(data.url ?? "");
        if (mode === "listing") setListingDraft(data.draft ?? data.url ?? "");
        if (mode === "map") {
          setShareUrl(data.url ?? "");
          setQrPayload(data.qrPayload ?? "");
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "share failed");
      }
    },
    [savedLand],
  );

  const handleDiscoverSurveyors = useCallback(async () => {
    if (!result?.center) return;
    setSurveyorLoading(true);
    setActionError("");
    try {
      const params = new URLSearchParams({
        lat: result.center.lat.toFixed(6),
        lon: result.center.lon.toFixed(6),
        role: "surveyor",
      });
      const res = await fetch(`/api/land/discover-surveyors?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { candidates?: Surveyor[] };
      setSurveyors(data.candidates ?? []);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "surveyor discovery failed");
    } finally {
      setSurveyorLoading(false);
    }
  }, [result]);

  const handleRequestQuote = useCallback(
    async (surveyorId: string) => {
      if (!savedLand) return;
      setActionError("");
      try {
        const requesterId = localStorage.getItem("ap_owner_id") || "guest";
        const res = await fetch(`/api/land/${savedLand.id}/surveyors/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surveyorId, requesterId, service: "land-survey" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setQuoteSentId(surveyorId);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "quote request failed");
      }
    },
    [savedLand],
  );

  const copyText = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  }, []);

  const statusMeta = result
    ? STATUS_LABELS[result.status] ?? { ar: result.status, en: result.status, tr: result.status, tone: "warn" as const }
    : null;
  const toneClass =
    statusMeta?.tone === "ok"
      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900"
      : statusMeta?.tone === "bad"
        ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900"
        : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900";

  const stageLabels: Record<Stage, string> = {
    idle: "",
    loading: t("جارٍ تحميل الملف...", "Loading file...", "Dosya yükleniyor..."),
    ocr: t("جارٍ التعرف على النص بالـ OCR...", "Running OCR...", "OCR çalışıyor..."),
    resolving: t("جارٍ تحديد الموقع وإسناد الإحداثيات...", "Resolving location & CRS...", "Konum ve CRS çözümleniyor..."),
    done: t("تم بنجاح!", "Done!", "Tamamlandı!"),
    error: t("حدث خطأ", "Error", "Hata"),
  };

  const confidenceFor = (key: "locationConfidence" | "boundaryConfidence" | "crsConfidence") => {
    const val = result?.[key];
    if (!val) return "—";
    return CONFIDENCE_LABELS[val]?.[locale === "ar" ? "ar" : "en"] ?? val;
  };

  return (
    <ToolCalculatorShell
      title={t(
        "حدد موقع أرضك من الصك — FindMyLand",
        "Find Your Land from the Deed — FindMyLand",
        "Tapunuzdan Arazinizi Bulun — FindMyLand",
      )}
      subtitle={t(
        "ارفع صورة/PDF الصك — نكتشف نظام الإحداثيات (CRS) ونحوّله إلى WGS84 ونحدد موقع الأرض على الخريطة",
        "Upload deed image/PDF — we detect the CRS, convert to WGS84, and locate the land on the map",
        "Tapu görseli/PDF yükleyin — CRS tespit edilir, WGS84'e dönüştürülür ve arsa haritada konumlanır",
      )}
      dir={dir}
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={stage !== "idle" && stage !== "done" && stage !== "error"}
            className="w-full px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-semibold transition-colors min-h-[48px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {t("📁 اختر صورة أو PDF للصك", "📁 Choose deed image or PDF", "📁 Tapu görseli veya PDF seçin")}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            {t(
              "لا ننشئ إحداثيات — نقرأ ما هو مكتوب في الصك فقط. إذا لم يرد نص الإحداثيات، نعرض خيارات التحديد الجزئي.",
              "We never invent coordinates — we only read what is written in the deed. If no coordinates appear, we show partial-resolution options.",
              "Koordinat uydurmayız — yalnızca tapuda yazılanı okuruz. Koordinat yoksa kısmi çözüm seçenekleri gösterilir.",
            )}
          </p>
        </div>

        {stage !== "idle" && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700 dark:text-gray-200">{stageLabels[stage]}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${stage === "error" ? "bg-red-500" : stage === "done" ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {stage === "error" && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4 text-sm mb-4">
            {errorMsg}
          </div>
        )}

        {actionError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4 text-sm mb-4">
            {actionError}
          </div>
        )}

        {stage === "done" && result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              {previewUrl && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    {t("الملف الأصلي", "Original file", "Orijinal dosya")}
                  </h3>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden max-h-64">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="deed" className="w-full object-contain max-h-64" />
                  </div>
                </div>
              )}

              <div className="mb-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <div className={`border rounded-lg p-3 mb-3 text-sm font-semibold ${toneClass}`}>
                  {statusMeta ? t(statusMeta.ar, statusMeta.en, statusMeta.tr) : result.status}
                </div>

                <dl className="space-y-2 text-sm">
                  {result.center && (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-xs text-gray-400">{t("خط العرض", "Latitude", "Enlem")}</dt>
                        <dd className="font-mono">{result.center.lat.toFixed(6)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-xs text-gray-400">{t("خط الطول", "Longitude", "Boylam")}</dt>
                        <dd className="font-mono">{result.center.lon.toFixed(6)}</dd>
                      </div>
                    </>
                  )}
                  {result.resolvedAddress && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-400">{t("العنوان", "Address", "Adres")}</dt>
                      <dd className="text-left">{result.resolvedAddress}</dd>
                    </div>
                  )}
                  {result.parcelIdentifiers?.planId && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-400">{t("رقم الخطة", "Plan #", "Plan No")}</dt>
                      <dd className="font-mono">{result.parcelIdentifiers.planId}</dd>
                    </div>
                  )}
                  {result.parcelIdentifiers?.parcelId && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-400">{t("رقم القطعة", "Parcel #", "Parsel No")}</dt>
                      <dd className="font-mono">{result.parcelIdentifiers.parcelId}</dd>
                    </div>
                  )}
                  {result.document?.category && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-400">{t("نوع الوثيقة", "Document", "Belge")}</dt>
                      <dd className="font-mono text-xs">{result.document.category}</dd>
                    </div>
                  )}
                </dl>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  {(["locationConfidence", "boundaryConfidence", "crsConfidence"] as const).map((key) => (
                    <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <div className="text-[10px] text-gray-400 uppercase">
                        {key === "locationConfidence"
                          ? t("الموقع", "Location", "Konum")
                          : key === "boundaryConfidence"
                            ? t("الحدود", "Boundary", "Sınır")
                            : t("CRS", "CRS", "CRS")}
                      </div>
                      <div className="text-xs font-bold mt-1">{confidenceFor(key)}</div>
                    </div>
                  ))}
                </div>

                {(result.extraction?.ocrUsed || result.extraction?.aiUsed || result.extraction?.geocodingUsed) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                    {result.extraction.ocrUsed && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
                        {t("OCR", "OCR", "OCR")}
                      </span>
                    )}
                    {result.extraction.aiUsed && (
                      <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded">
                        {t("AI توليد", "AI generated", "AI üretildi")}
                      </span>
                    )}
                    {result.extraction.geocodingUsed && (
                      <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
                        {t("ترميز جغرافي", "Geocoded", "Coğrafi kod")}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {result.warnings && result.warnings.length > 0 && (
                <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
                  <ul className="space-y-1 list-disc list-inside">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.center && (
                <div className="mb-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    {t("إجراءات المتابعة", "Follow-up actions", "Takip adımları")}
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={handleSaveLand}
                      disabled={!!savedLand}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-semibold min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {savedLand
                        ? t("تم الحفظ ✓", "Saved ✓", "Kaydedildi ✓")
                        : t("💾 حفظ الأرض ومتابعة", "💾 Save land & continue", "💾 Araziyi kaydet ve devam et")}
                    </button>

                    {savedLand && (
                      <>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleShare("map")}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {t("🔗 رابط المشاركة", "🔗 Share link", "🔗 Paylaşım linki")}
                          </button>
                          <button
                            onClick={() => handleShare("directions")}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {t("🧭 الاتجاهات", "🧭 Directions", "🧭 Yol tarifi")}
                          </button>
                          <button
                            onClick={() => handleShare("listing")}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {t("🏷️ إعلان", "🏷️ Listing", "🏷️ İlan")}
                          </button>
                        </div>

                        {shareUrl && (
                          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                            <span className="text-xs font-mono text-gray-500 truncate flex-1">{shareUrl}</span>
                            <button
                              onClick={() => copyText(shareUrl, 900)}
                              className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                              aria-label="Copy share URL"
                            >
                              {copiedIdx === 900 ? "✓" : "📋"}
                            </button>
                          </div>
                        )}

                        {qrPayload && (
                          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                            <span className="text-xs font-mono text-gray-500 truncate flex-1">{qrPayload}</span>
                            <button
                              onClick={() => copyText(qrPayload, 901)}
                              className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                              aria-label="Copy QR payload"
                            >
                              {copiedIdx === 901 ? "✓" : "🖼️"}
                            </button>
                          </div>
                        )}

                        {directionsUrl && (
                          <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold text-center min-h-[44px] focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            {t("فتح الاتجاهات في الخريطة ↗", "Open directions ↗", "Yol tarifini aç ↗")}
                          </a>
                        )}

                        {listingDraft && (
                          <details className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                              {t("عرض مسودة الإعلان", "Show listing draft", "İlan taslağını göster")}
                            </summary>
                            <pre className="mt-2 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                              {listingDraft}
                            </pre>
                          </details>
                        )}

                        <div className="pt-1">
                          <button
                            onClick={handleDiscoverSurveyors}
                            disabled={surveyorLoading}
                            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-semibold min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {surveyorLoading
                              ? t(
                                  "جارٍ البحث في دليل المساحين (AMRS)...",
                                  "Searching AMRS surveyor directory...",
                                  "AMRS haritacı rehberi aranıyor...",
                                )
                              : t(
                                  "🧑‍🔧 العثور على مسّاحين قريبين (AMRS)",
                                  "🧑‍🔧 Find nearby surveyors (AMRS)",
                                  "🧑‍🔧 Yakın haritacıları bul (AMRS)",
                                )}
                          </button>
                        </div>

                        {surveyors !== null && (
                          <div className="space-y-2 mt-1">
                            {surveyors.length === 0 && (
                              <p className="text-xs text-gray-400 text-center py-2">
                                {t(
                                  "لا يوجد مسّاحون في الدليل حالياً",
                                  "No surveyors in the directory right now",
                                  "Rehberde şu an haritacı yok",
                                )}
                              </p>
                            )}
                            {surveyors.map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {s.name}
                                    {s.isVerified && (
                                      <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-gray-400">
                                    {s.ratingAvg != null && <span>★ {s.ratingAvg.toFixed(1)}</span>}
                                    {s.reputationLevel && <span> · {s.reputationLevel}</span>}
                                    {s.distanceKm != null && <span> · {s.distanceKm.toFixed(1)} km</span>}
                                    {s.jobsCompleted != null && (
                                      <span>
                                        {" "}
                                        · {s.jobsCompleted} {t("مهمة", "jobs", "iş")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRequestQuote(s.id)}
                                  disabled={!savedLand || quoteSentId === s.id}
                                  className="shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg text-xs font-semibold min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  {quoteSentId === s.id
                                    ? t("تم إرسال الطلب ✓", "Sent ✓", "Gönderildi ✓")
                                    : t("طلب عرض سعر", "Request quote", "Teklif iste")}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {ocrText && (
                <details className="mt-4">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                    {t("عرض النص المستخرج من OCR", "Show extracted text", "Çıkarılan metni göster")}
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-60 whitespace-pre-wrap font-mono">
                    {ocrText}
                  </pre>
                </details>
              )}

              {result.steps && result.steps.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                    {t("خطوات التحليل", "Analysis steps", "Analiz adımları")}
                  </summary>
                  <ol className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400 list-decimal list-inside">
                    {result.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </details>
              )}

              {result.center && (
                <div className="mt-3">
                  <ToolSecondaryActions
                    actions={[
                      {
                        label: t(
                          "نسخ الإحداثيات (WGS84)",
                          "Copy WGS84 coordinates",
                          "WGS84 koordinatlarını kopyala",
                        ),
                        onClick: () =>
                          copyText(`${result.center!.lat.toFixed(6)}, ${result.center!.lon.toFixed(6)}`, 902),
                      },
                    ]}
                  />
                </div>
              )}
            </div>

            <div>
              {result.center ? (
                <div ref={mapRef} className="w-full h-[400px] rounded-lg border border-gray-200 dark:border-gray-800" />
              ) : (
                <div className="w-full h-[400px] rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm p-6 text-center">
                  {t(
                    "لم يتم العثور على إحداثيات صريحة — راجع الخطوات للخيارات",
                    "No explicit coordinates found — see steps for options",
                    "Açık koordinat bulunamadı — seçenekler için adımlara bakın",
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolCalculatorShell>
  );
}
