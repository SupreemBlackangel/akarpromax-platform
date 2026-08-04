"use client";

import { useCallback, useMemo, useState } from "react";
import proj4 from "proj4";

type Props = { locale: string };

type Format = "dd" | "dms" | "ddm" | "utm";

const OMAN_ZONES = [38, 39, 40];

function ddToDms(dd: number, isLat: boolean): string {
  const dir = isLat ? (dd >= 0 ? "N" : "S") : (dd >= 0 ? "E" : "W");
  const abs = Math.abs(dd);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = ((mFloat - m) * 60).toFixed(2);
  return `${d}° ${m}' ${s}" ${dir}`;
}

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

function toUtm(ddLat: number, ddLng: number, zone: number): { easting: number; northing: number; zone: number } {
  const utmDef = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
  const wgs84 = "+proj=longlat +datum=WGS84 +no_defs";
  const [easting, northing] = proj4(wgs84, utmDef, [ddLng, ddLat]);
  return { easting, northing, zone };
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

export function CoordinateConverter({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [inputFormat, setInputFormat] = useState<Format>("dd");
  const [latInput, setLatInput] = useState("23.5880");
  const [lngInput, setLngInput] = useState("58.3829");
  const [dmsDirLat, setDmsDirLat] = useState("N");
  const [dmsDirLng, setDmsDirLng] = useState("E");
  const [utmZone, setUtmZone] = useState(39);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

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
      } else {
        ddLat = parseFloat(latInput);
        ddLng = parseFloat(lngInput);
        if (isNaN(ddLat) || isNaN(ddLng)) return null;
      }

      if (ddLat < -90 || ddLat > 90 || ddLng < -180 || ddLng > 180) return null;

      const utm = toUtm(ddLat, ddLng, utmZone);
      const dmsLat = ddToDms(ddLat, true);
      const dmsLng = ddToDms(ddLng, false);
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

  const copyToClipboard = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  }, []);

  const rows = useMemo(() => {
    if (!parsed) return [];
    return [
      { label: "DD (Decimal Degrees)", value: `${parsed.dd.lat}, ${parsed.dd.lng}`, copy: `${parsed.dd.lat}, ${parsed.dd.lng}` },
      { label: "DMS (Degrees Minutes Seconds)", value: `${parsed.dms.lat}\n${parsed.dms.lng}`, copy: `${parsed.dms.lat}, ${parsed.dms.lng}` },
      { label: "DDM (Degrees Decimal Minutes)", value: `${parsed.ddm.lat}\n${parsed.ddm.lng}`, copy: `${parsed.ddm.lat}, ${parsed.ddm.lng}` },
      { label: `UTM Zone ${parsed.utm.zone}`, value: `E: ${parsed.utm.easting}\nN: ${parsed.utm.northing}`, copy: `${parsed.utm.easting}\t${parsed.utm.northing}` },
    ];
  }, [parsed]);

  return (
    <div dir={dir} className="max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 text-center">
        {locale === "ar" ? "تحويل الإحداثيات الجغرافية" : "Coordinate Converter"}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
        {locale === "ar" ? "تحويل فوري بين DD و DMS و DDM و UTM" : "Instant conversion between DD / DMS / DDM / UTM"}
      </p>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {(["dd", "dms", "ddm", "utm"] as Format[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setInputFormat(fmt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                inputFormat === fmt
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {inputFormat === "utm" ? (locale === "ar" ? "Easting (X)" : "Easting (X)") : (locale === "ar" ? "خط العرض (Lat)" : "Latitude (Lat)")}
            </label>
            <input
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder={inputFormat === "dd" ? "23.5880" : inputFormat === "dms" ? "23° 35' 16.8\" N" : inputFormat === "ddm" ? "23° 35.28' N" : "437000"}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {inputFormat === "utm" ? (locale === "ar" ? "Northing (Y)" : "Northing (Y)") : (locale === "ar" ? "خط الطول (Lng)" : "Longitude (Lng)")}
            </label>
            <input
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              placeholder={inputFormat === "dd" ? "58.3829" : inputFormat === "dms" ? "58° 22' 58.4\" E" : inputFormat === "ddm" ? "58° 22.97' E" : "2606000"}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono"
            />
          </div>
        </div>

        {(inputFormat === "dms" || inputFormat === "ddm") && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {locale === "ar" ? "اتجاه خط العرض" : "Lat Direction"}
              </label>
              <select
                value={dmsDirLat}
                onChange={(e) => setDmsDirLat(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              >
                <option value="N">N (North)</option>
                <option value="S">S (South)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {locale === "ar" ? "اتجاه خط الطول" : "Lng Direction"}
              </label>
              <select
                value={dmsDirLng}
                onChange={(e) => setDmsDirLng(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
              >
                <option value="E">E (East)</option>
                <option value="W">W (West)</option>
              </select>
            </div>
          </div>
        )}

        <div className="mt-3">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            {locale === "ar" ? "نطاق UTM" : "UTM Zone"}
          </label>
          <div className="flex gap-2">
            {OMAN_ZONES.map((z) => (
              <button
                key={z}
                onClick={() => setUtmZone(z)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  utmZone === z
                    ? "bg-green-600 text-white"
                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                }`}
              >
                Zone {z}
              </button>
            ))}
          </div>
        </div>
      </div>

      {parsed ? (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{row.label}</div>
                <div className="text-sm font-mono text-gray-900 dark:text-white whitespace-pre-line">{row.value}</div>
              </div>
              <button
                onClick={() => copyToClipboard(row.copy, i)}
                className="shrink-0 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              >
                {copiedIdx === i ? "✓" : "📋"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4 text-sm text-center">
          {locale === "ar" ? "أدخل إحداثيات صحيحة للحصول على النتائج" : "Enter valid coordinates to see results"}
        </div>
      )}
    </div>
  );
}
