"use client";

import { useCallback, useMemo, useState } from "react";
import { ToolCalculatorShell } from "./ToolCalculatorShell";
import { ToolSecondaryActions } from "./ToolSecondaryActions";
import {
  decimalToDms,
  formatDms,
  parseCoordinates,
  utmToWgs84,
  wgs84ToUtm,
  type DmsCoordinate,
  type ParsedCoordinate,
  type UtmCoordinate,
} from "@/lib/engineering/coordinate/coordinate-core";

type Props = { locale: string };

type Format = "dd" | "dms" | "ddm" | "utm";

type BatchRow = {
  id: number;
  source: ParsedCoordinate["source"];
  lat: number;
  lng: number;
  utm: UtmCoordinate;
  dmsLat: DmsCoordinate;
  dmsLng: DmsCoordinate;
};

const OMAN_ZONES = [38, 39, 40];

function ddToDdm(dd: number, isLat: boolean): string {
  const dir = isLat ? (dd >= 0 ? "N" : "S") : (dd >= 0 ? "E" : "W");
  const abs = Math.abs(dd);
  const d = Math.floor(abs);
  const m = ((abs - d) * 60).toFixed(4);
  return `${d}° ${m}' ${dir}`;
}

function dmsToDd(d: number, m: number, s: number, dir: string): number {
  const sign = dir === "S" || dir === "W" ? -1 : 1;
  return sign * (d + m / 60 + s / 3600);
}

function ddmToDd(d: number, m: number, dir: string): number {
  const sign = dir === "S" || dir === "W" ? -1 : 1;
  return sign * (d + m / 60);
}

function parseDmsInput(input: string): { d: number; m: number; s: number; dir: string } | null {
  const cleaned = input.trim().toUpperCase();
  const dirMatch = cleaned.match(/([NSEW])$/);
  const dir = dirMatch ? dirMatch[1] : "";
  const numPart = cleaned.replace(/[NSEW]$/, "").trim();
  const parts = numPart.split(/[°'"\s]+/).filter(Boolean).map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return { d: parts[0], m: parts[1], s: parts[2], dir };
  }
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { d: parts[0], m: parts[1], s: 0, dir };
  }
  return null;
}

function downloadBlob(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function CoordinateConverter({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [mode, setMode] = useState<"single" | "batch">("single");

  const t3 = (ar: string, en: string, tr: string) => (locale === "ar" ? ar : locale === "tr" ? tr : en);

  const [inputFormat, setInputFormat] = useState<Format>("dd");
  const [latInput, setLatInput] = useState("23.5880");
  const [lngInput, setLngInput] = useState("58.3829");
  const [dmsDirLat, setDmsDirLat] = useState("N");
  const [dmsDirLng, setDmsDirLng] = useState("E");
  const [utmZone, setUtmZone] = useState(39);

  const [batchInput, setBatchInput] = useState("");
  const [batchRows, setBatchRows] = useState<BatchRow[] | null>(null);
  const [batchErrors, setBatchErrors] = useState<string[]>([]);

  const parsed = useMemo(() => {
    try {
      let ddLat: number;
      let ddLng: number;

      if (inputFormat === "dd") {
        ddLat = parseFloat(latInput);
        ddLng = parseFloat(lngInput);
        if (isNaN(ddLat) || isNaN(ddLng)) return null;
      } else if (inputFormat === "dms") {
        const latParsed = parseDmsInput(latInput);
        const lngParsed = parseDmsInput(lngInput);
        if (!latParsed || !lngParsed) return null;
        ddLat = dmsToDd(latParsed.d, latParsed.m, latParsed.s, latParsed.dir || dmsDirLat);
        ddLng = dmsToDd(lngParsed.d, lngParsed.m, lngParsed.s, lngParsed.dir || dmsDirLng);
      } else if (inputFormat === "ddm") {
        const latParts = latInput.trim().split(/[°']/).filter(Boolean).map(Number);
        const lngParts = lngInput.trim().split(/[°']/).filter(Boolean).map(Number);
        if (latParts.length < 2 || lngParts.length < 2 || isNaN(latParts[0]) || isNaN(latParts[1]) || isNaN(lngParts[0]) || isNaN(lngParts[1])) return null;
        ddLat = ddmToDd(latParts[0], latParts[1], dmsDirLat);
        ddLng = ddmToDd(lngParts[0], lngParts[1], dmsDirLng);
      } else if (inputFormat === "utm") {
        const easting = parseFloat(latInput);
        const northing = parseFloat(lngInput);
        if (isNaN(easting) || isNaN(northing)) return null;
        const { lat, lng } = utmToWgs84(utmZone, "N", easting, northing);
        ddLat = lat;
        ddLng = lng;
      } else {
        ddLat = parseFloat(latInput);
        ddLng = parseFloat(lngInput);
        if (isNaN(ddLat) || isNaN(ddLng)) return null;
      }

      if (ddLat < -90 || ddLat > 90 || ddLng < -180 || ddLng > 180) return null;

      const utm = wgs84ToUtm(ddLat, ddLng, utmZone);
      const dmsLat = formatDms(decimalToDms(ddLat, true));
      const dmsLng = formatDms(decimalToDms(ddLng, false));
      const ddmLat = ddToDdm(ddLat, true);
      const ddmLng = ddToDdm(ddLng, false);

      return {
        dd: { lat: ddLat.toFixed(8), lng: ddLng.toFixed(8) },
        dms: { lat: dmsLat, lng: dmsLng },
        ddm: { lat: ddmLat, lng: ddmLng },
        utm: { easting: utm.easting.toFixed(3), northing: utm.northing.toFixed(3), zone: utm.zone },
      };
    } catch {
      return null;
    }
  }, [latInput, lngInput, inputFormat, dmsDirLat, dmsDirLng, utmZone]);

  const rows = useMemo(() => {
    if (!parsed) return [];
    return [
      { label: "DD (Decimal Degrees)", value: `${parsed.dd.lat}, ${parsed.dd.lng}`, copy: `${parsed.dd.lat}, ${parsed.dd.lng}` },
      { label: "DMS (Degrees Minutes Seconds)", value: `${parsed.dms.lat}\n${parsed.dms.lng}`, copy: `${parsed.dms.lat}, ${parsed.dms.lng}` },
      { label: "DDM (Degrees Decimal Minutes)", value: `${parsed.ddm.lat}\n${parsed.ddm.lng}`, copy: `${parsed.ddm.lat}, ${parsed.ddm.lng}` },
      { label: `UTM Zone ${parsed.utm.zone}`, value: `E: ${parsed.utm.easting}\nN: ${parsed.utm.northing}`, copy: `${parsed.utm.easting}\t${parsed.utm.northing}` },
    ];
  }, [parsed]);

  const copyResult = useCallback(() => {
    if (!parsed) return;
    const text = rows.map((r) => `${r.label}: ${r.copy}`).join("\n");
    navigator.clipboard.writeText(text);
  }, [parsed, rows]);

  const handleBatchConvert = useCallback(() => {
    if (!batchInput.trim()) {
      setBatchRows(null);
      setBatchErrors([]);
      return;
    }
    const parsedBatch = parseCoordinates(batchInput);
    const rows2: BatchRow[] = parsedBatch.coordinates.map((c, i) => {
      const utm = wgs84ToUtm(c.lat, c.lng);
      return {
        id: i + 1,
        source: c.source,
        lat: c.lat,
        lng: c.lng,
        utm,
        dmsLat: decimalToDms(c.lat, true),
        dmsLng: decimalToDms(c.lng, false),
      };
    });
    setBatchRows(rows2);
    setBatchErrors(parsedBatch.errors);
  }, [batchInput]);

  const handleCopyBatch = useCallback(() => {
    if (!batchRows?.length) return;
    const text = batchRows
      .map((r) => `${r.lat.toFixed(8)}, ${r.lng.toFixed(8)}\t${r.utm.easting.toFixed(3)} ${r.utm.northing.toFixed(3)} (${r.utm.zone}${r.utm.hemisphere})`)
      .join("\n");
    navigator.clipboard.writeText(text);
  }, [batchRows]);

  const handleExportCsv = useCallback(() => {
    if (!batchRows?.length) return;
    let csv = "Point,Latitude,Longitude,UTM_Easting,UTM_Northing,Zone,Hemisphere\n";
    for (const r of batchRows) {
      csv += `${r.id},${r.lat.toFixed(8)},${r.lng.toFixed(8)},${r.utm.easting.toFixed(3)},${r.utm.northing.toFixed(3)},${r.utm.zone},${r.utm.hemisphere}\n`;
    }
    downloadBlob(csv, `coordinates_${Date.now()}.csv`, "text/csv");
  }, [batchRows]);

  const handleDxfHandoff = useCallback(() => {
    if (!batchRows?.length) return;
    const points = batchRows.map((r) => ({
      id: `P${r.id}`,
      x: r.utm.easting,
      y: r.utm.northing,
      z: 0,
    }));
    localStorage.setItem("dxf_points", JSON.stringify(points));
    window.location.assign("/tools?tool=points2dxf");
  }, [batchRows]);

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "تحويل الإحداثيات الجغرافية" : locale === "tr" ? "Koordinat Çevirici" : "Coordinate Converter",
      subtitle: locale === "ar" ? "تحويل فوري بين DD و DMS و DDM و UTM — تحويل فردي أو دفعات" : locale === "tr" ? "DD / DMS / DDM / UTM arası anında çeviri — tekli veya toplu" : "Instant conversion between DD / DMS / DDM / UTM — single or batch",
      copy: locale === "ar" ? "نسخ الكل" : locale === "tr" ? "Tümünü Kopyala" : "Copy All",
      share: locale === "ar" ? "مشاركة" : locale === "tr" ? "Paylaş" : "Share",
    };
    return m[k] ?? k;
  };

  return (
    <ToolCalculatorShell title={t("title")} subtitle={t("subtitle")} dir={dir}>
      <div className="max-w-2xl mx-auto">
        <div className="flex gap-2 mb-4">
          {(["single", "batch"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                mode === m
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              {m === "single"
                ? t3("مفرد", "Single", "Tek")
                : t3("دفعة", "Batch", "Toplu")}
            </button>
          ))}
        </div>

        {mode === "single" && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {(["dd", "dms", "ddm", "utm"] as Format[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setInputFormat(fmt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    inputFormat === fmt
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {inputFormat === "utm" ? "Easting (X)" : t3("خط العرض (Lat)", "Latitude (Lat)", "Enlem (Lat)")}
                </label>
                <input
                  dir="ltr"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder={inputFormat === "dd" ? "23.5880" : inputFormat === "dms" ? "23° 35' 16.8\" N" : inputFormat === "ddm" ? "23° 35.28' N" : "437000"}
                  className="w-full px-3 py-2 text-[16px] sm:text-sm bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono min-h-[48px] md:min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  aria-label={inputFormat === "utm" ? "Easting" : "Latitude"}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {inputFormat === "utm" ? "Northing (Y)" : t3("خط الطول (Lng)", "Longitude (Lng)", "Boylam (Lng)")}
                </label>
                <input
                  dir="ltr"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder={inputFormat === "dd" ? "58.3829" : inputFormat === "dms" ? "58° 22' 58.4\" E" : inputFormat === "ddm" ? "58° 22.97' E" : "2606000"}
                  className="w-full px-3 py-2 text-[16px] sm:text-sm bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono min-h-[48px] md:min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  aria-label={inputFormat === "utm" ? "Northing" : "Longitude"}
                />
              </div>
            </div>

            {(inputFormat === "dms" || inputFormat === "ddm") && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t3("اتجاه خط العرض", "Lat Direction", "Enlem Yönü")}
                  </label>
                  <select
                    value={dmsDirLat}
                    onChange={(e) => setDmsDirLat(e.target.value)}
                    className="w-full px-3 py-2 text-[16px] sm:text-sm bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg min-h-[48px] md:min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    aria-label="Latitude direction"
                  >
                    <option value="N">N (North)</option>
                    <option value="S">S (South)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t3("اتجاه خط الطول", "Lng Direction", "Boylam Yönü")}
                  </label>
                  <select
                    value={dmsDirLng}
                    onChange={(e) => setDmsDirLng(e.target.value)}
                    className="w-full px-3 py-2 text-[16px] sm:text-sm bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg min-h-[48px] md:min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    aria-label="Longitude direction"
                  >
                    <option value="E">E (East)</option>
                    <option value="W">W (West)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="mt-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t3("نطاق UTM", "UTM Zone", "UTM Bölgesi")}
              </label>
              <div className="flex gap-2">
                {OMAN_ZONES.map((z) => (
                  <button
                    key={z}
                    onClick={() => setUtmZone(z)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                      utmZone === z
                        ? "bg-green-600 text-white"
                        : "bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    Zone {z}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === "batch" && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t3("ألصق الإحداثيات (سطر لكل نقطة)", "Paste coordinates (one point per line)", "Koordinatları yapıştırın (her satıra bir nokta)")}
            </label>
            <textarea
              dir="ltr"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              rows={7}
              className="w-full px-3 py-2 text-[16px] sm:text-sm bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder={"21.543333, 39.172778\n23.5880, 58.3829\n23° 35' 16.8\" N 58° 22' 58.4\" E\n39N 437000 2606000"}
            />
            <button
              onClick={handleBatchConvert}
              className="w-full mt-3 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {t3("تحويل", "Convert", "Dönüştür")}
            </button>
          </div>
        )}

        {mode === "single" && (
          <>
            {parsed ? (
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div
                    key={i}
                    className="bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{row.label}</div>
                      <div className="text-sm font-mono text-gray-900 dark:text-white whitespace-pre-line" dir="ltr">{row.value}</div>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(row.copy)}
                      className="shrink-0 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      aria-label={`Copy ${row.label}`}
                    >
                      📋
                    </button>
                  </div>
                ))}
                <ToolSecondaryActions
                  actions={[
                    { label: t("copy"), onClick: copyResult },
                  ]}
                />
              </div>
            ) : (
              <div className="bg-[var(--color-error-soft)] dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4 text-sm text-center">
                {t3("أدخل إحداثيات صحيحة للحصول على النتائج", "Enter valid coordinates to see results", "Sonuçlar için geçerli koordinatlar girin")}
              </div>
            )}
          </>
        )}

        {mode === "batch" && batchRows && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{t3("عدد النقاط", "Points", "Nokta")}: {batchRows.length}</span>
              <span>{t3("أخطاء", "Errors", "Hatalar")}: {batchErrors.length}</span>
            </div>
            {batchErrors.length > 0 && (
              <div className="bg-[var(--color-error-soft)] dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-3 text-xs">
                {batchErrors.map((err, i) => (
                  <div key={i} dir="ltr">{t3("سطر غير معروف", "Unrecognized line", "Tanınmayan satır")}: {err}</div>
                ))}
              </div>
            )}
            {batchRows.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {batchRows.map((r) => (
                  <div
                    key={r.id}
                    className="bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        {t3("النقطة", "Point", "Nokta")} {r.id} — {r.source.toUpperCase()}
                      </div>
                      <div className="text-sm font-mono text-gray-900 dark:text-white" dir="ltr">
                        {r.lat.toFixed(8)}, {r.lng.toFixed(8)}
                      </div>
                      <div className="text-xs text-gray-400 font-mono" dir="ltr">
                        UTM {r.utm.zone}{r.utm.hemisphere}: {r.utm.easting.toFixed(3)} {r.utm.northing.toFixed(3)}
                      </div>
                      <div className="text-xs text-gray-400 font-mono" dir="ltr">
                        {formatDms(r.dmsLat)} {formatDms(r.dmsLng)}
                      </div>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${r.lat.toFixed(8)}, ${r.lng.toFixed(8)}`)}
                      className="shrink-0 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      aria-label={`Copy point ${r.id}`}
                    >
                      📋
                    </button>
                  </div>
                ))}
              </div>
            )}
            {batchRows.length > 0 && (
              <ToolSecondaryActions
                actions={[
                  { label: t("copy"), icon: "📋", onClick: handleCopyBatch },
                  { label: t3("تصدير CSV", "Export CSV", "CSV İndir"), icon: "⬇️", onClick: handleExportCsv },
                  { label: t3("إرسال إلى نقاط → DXF", "Send to Points → DXF", "Noktalar → DXF"), icon: "📏", onClick: handleDxfHandoff },
                ]}
              />
            )}
            {batchRows.length === 0 && batchErrors.length === 0 && (
              <div className="bg-[var(--color-error-soft)] dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4 text-sm text-center">
                {t3("لم يتم العثور على إحداثيات صالحة", "No valid coordinates found", "Geçerli koordinat bulunamadı")}
              </div>
            )}
          </div>
        )}
      </div>
    </ToolCalculatorShell>
  );
}
