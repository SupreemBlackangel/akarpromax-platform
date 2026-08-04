"use client";

import { useCallback, useMemo, useState } from "react";

type Props = { locale: string };

type Shape = "polygon" | "triangle" | "regular" | "circle";

const UNIT_LABELS: Record<string, Record<string, string>> = {
  ar: { m2: "م²", km2: "كم²", ha: "هكتار", dunum: "دونم", acre: "فدان", ft2: "قدم²", yd2: "ياردة²" },
  en: { m2: "m²", km2: "km²", ha: "ha", dunum: "dunum", acre: "acre", ft2: "ft²", yd2: "yd²" },
  tr: { m2: "m²", km2: "km²", ha: "ha", dunum: "dönüm", acre: "acre", ft2: "ft²", yd2: "yd²" },
};

const UNIT_TO_M2: Record<string, number> = {
  m2: 1,
  km2: 1_000_000,
  ha: 10_000,
  dunum: 1000,
  acre: 4046.8564224,
  ft2: 0.09290304,
  yd2: 0.83612736,
};

function shoelaceArea(coords: Array<[number, number]>): number {
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  return Math.abs(area) / 2;
}

function triangleAreaSSS(a: number, b: number, c: number): number {
  const s = (a + b + c) / 2;
  return Math.sqrt(s * (s - a) * (s - b) * (s - c));
}

function triangleAreaSAS(a: number, b: number, angleDeg: number): number {
  const angleRad = (angleDeg * Math.PI) / 180;
  return 0.5 * a * b * Math.sin(angleRad);
}

function regularPolygonArea(n: number, side: number): number {
  return (n * side * side) / (4 * Math.tan(Math.PI / n));
}

function circleArea(radius: number): number {
  return Math.PI * radius * radius;
}

export function AreaCalculator({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const labels = UNIT_LABELS[locale] ?? UNIT_LABELS.en;
  const [shape, setShape] = useState<Shape>("polygon");
  const [unit, setUnit] = useState("m2");
  const [polygonText, setPolygonText] = useState("0,0\n100,0\n100,50\n0,50");
  const [triA, setTriA] = useState("3");
  const [triB, setTriB] = useState("4");
  const [triC, setTriC] = useState("5");
  const [triSasAngle, setTriSasAngle] = useState("90");
  const [triMode, setTriMode] = useState<"sss" | "sas">("sss");
  const [regSides, setRegSides] = useState("6");
  const [regSide, setRegSide] = useState("10");
  const [circleRadius, setCircleRadius] = useState("5");

  const parsePolygon = useCallback((): Array<[number, number]> | null => {
    try {
      return polygonText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(/[,\s\t]+/).map(Number);
          if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
          return [parts[0], parts[1]] as [number, number];
        })
        .filter((p): p is [number, number] => p !== null);
    } catch {
      return null;
    }
  }, [polygonText]);

  const rawArea = useMemo(() => {
    try {
      if (shape === "polygon") {
        const coords = parsePolygon();
        if (!coords || coords.length < 3) return null;
        return shoelaceArea(coords);
      }
      if (shape === "triangle") {
        const a = parseFloat(triA), b = parseFloat(triB), c = parseFloat(triC);
        if ([a, b, c].some(isNaN) || a <= 0 || b <= 0 || c <= 0) return null;
        if (triMode === "sss") {
          if (a + b <= c || a + c <= b || b + c <= a) return null;
          return triangleAreaSSS(a, b, c);
        }
        const angle = parseFloat(triSasAngle);
        if (isNaN(angle) || angle <= 0 || angle >= 180) return null;
        return triangleAreaSAS(a, b, angle);
      }
      if (shape === "regular") {
        const n = parseInt(regSides), s = parseFloat(regSide);
        if (isNaN(n) || isNaN(s) || n < 3 || s <= 0) return null;
        return regularPolygonArea(n, s);
      }
      if (shape === "circle") {
        const r = parseFloat(circleRadius);
        if (isNaN(r) || r <= 0) return null;
        return circleArea(r);
      }
      return null;
    } catch {
      return null;
    }
  }, [shape, triA, triB, triC, triMode, triSasAngle, regSides, regSide, circleRadius, parsePolygon]);

  const conversions = useMemo(() => {
    if (rawArea === null) return [];
    return Object.entries(UNIT_TO_M2).map(([key, factor]) => ({
      unit: key,
      label: labels[key] ?? key,
      value: rawArea * factor,
    }));
  }, [rawArea, labels]);

  const formatNum = (n: number) => {
    if (Math.abs(n) >= 1000000) return n.toExponential(4);
    return n.toLocaleString(locale === "ar" ? "ar-OM" : locale === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 4 });
  };

  return (
    <div dir={dir} className="max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 text-center">
        {locale === "ar" ? "حساب المساحات وتحويل الوحدات" : "Area Calculator & Unit Converter"}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
        {locale === "ar" ? "مضلعات، مثلثات، أشكال منتظمة، دوائر + تحويل فوري" : "Polygons, triangles, regular shapes, circles + instant conversion"}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["polygon", "triangle", "regular", "circle"] as Shape[]).map((s) => (
          <button
            key={s}
            onClick={() => setShape(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              shape === s
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            {s === "polygon" ? (locale === "ar" ? "مضلع" : "Polygon") : s === "triangle" ? (locale === "ar" ? "مثلث" : "Triangle") : s === "regular" ? (locale === "ar" ? "شكل منتظم" : "Regular") : (locale === "ar" ? "دائرة" : "Circle")}
          </button>
        ))}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
        {shape === "polygon" && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {locale === "ar" ? "الإحداثيات (سطر واحد لكل نقطة: X,Y أو X Y)" : "Coordinates (one point per line: X,Y or X Y)"}
            </label>
            <textarea
              value={polygonText}
              onChange={(e) => setPolygonText(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono"
              placeholder={"0,0\n100,0\n100,50\n0,50"}
            />
            <p className="text-xs text-gray-400 mt-1">
              {locale === "ar" ? `النقطة الحالية: ${parsePolygon()?.length ?? 0} نقطة` : `Current: ${parsePolygon()?.length ?? 0} points`}
            </p>
          </div>
        )}

        {shape === "triangle" && (
          <div>
            <div className="flex gap-2 mb-3">
              {(["sss", "sas"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setTriMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    triMode === m ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {m === "sss" ? "SSS (3 أضلاع)" : "SAS (ضلاع وزاوية)"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">a</label>
                <input value={triA} onChange={(e) => setTriA(e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">b</label>
                <input value={triB} onChange={(e) => setTriB(e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{triMode === "sss" ? "c" : (locale === "ar" ? "الزاوية (°)" : "Angle (°)")}</label>
                <input
                  value={triMode === "sss" ? triC : triSasAngle}
                  onChange={(e) => triMode === "sss" ? setTriC(e.target.value) : setTriSasAngle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {shape === "regular" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{locale === "ar" ? "عدد الأضلاع" : "Number of sides"}</label>
              <input value={regSides} onChange={(e) => setRegSides(e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{locale === "ar" ? "طول الضلع" : "Side length"}</label>
              <input value={regSide} onChange={(e) => setRegSide(e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono" />
            </div>
          </div>
        )}

        {shape === "circle" && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{locale === "ar" ? "نصف القطر" : "Radius"}</label>
            <input
              value={circleRadius}
              onChange={(e) => setCircleRadius(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono"
            />
          </div>
        )}
      </div>

      {rawArea !== null ? (
        <div className="space-y-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
              {locale === "ar" ? "المساحة" : "Area"}
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono">
              {formatNum(rawArea)} {labels.m2}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {conversions.map((c) => (
              <div
                key={c.unit}
                className={`rounded-lg p-3 text-center border transition-colors cursor-pointer ${
                  c.unit === unit
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-blue-200"
                }`}
                onClick={() => setUnit(c.unit)}
              >
                <div className="text-[10px] text-gray-500 dark:text-gray-400">{c.label}</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white font-mono">{formatNum(c.value)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4 text-sm text-center">
          {locale === "ar" ? "أدخل القيم المطلوبة لحساب المساحة" : "Enter the required values to calculate area"}
        </div>
      )}
    </div>
  );
}
