"use client";

import { useCallback, useMemo, useState } from "react";
import { calcPaint, type PaintInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";

type Props = { locale: string };

export function PaintCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<PaintInput>("paint", { wallArea: 0, ceilingArea: 0, coats: 2, coveragePerLiter: 10 });
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (input.wallArea <= 0 && input.ceilingArea <= 0) return null;
    return calcPaint(input);
  }, [input]);

  const share = useUrlShare({ wa: input.wallArea, ca: input.ceilingArea, c: input.coats, cov: input.coveragePerLiter });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `الدهان: المساحة ${result.totalArea} م² | البويات: ${result.litersNeeded} لتر (${result.gallonsNeeded} جالون)`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }, [result]);

  const loadExample = () => setInput({ wallArea: 45, ceilingArea: 15, coats: 2, coveragePerLiter: 10 });
  const set = (field: keyof PaintInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setInput({ ...input, [field]: isNaN(v) ? 0 : v });
  };

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة الدهان" : "Paint Calculator",
      subtitle: locale === "ar" ? "حساب استهلاك البويات بالجالون واللتر" : "Calculate paint consumption in gallons/liters",
      wallArea: locale === "ar" ? "مساحة الجدران (م²)" : "Wall Area (m²)",
      ceilingArea: locale === "ar" ? "مساحة السقف (م²)" : "Ceiling Area (m²)",
      coats: locale === "ar" ? "عدد الطبقات" : "Number of Coats",
      coverage: locale === "ar" ? "التغطية (لتر/م²)" : "Coverage (L/m²)",
      totalArea: locale === "ar" ? "المساحة الكلية" : "Total Area",
      liters: locale === "ar" ? "البويات (لتر)" : "Paint (liters)",
      gallons: locale === "ar" ? "البويات (جالون)" : "Paint (gallons)",
      example: locale === "ar" ? "مثال" : "Example",
      copy: locale === "ar" ? "نسخ" : "Copy",
      share: locale === "ar" ? "مشاركة" : "Share",
    };
    return m[k] ?? k;
  };

  return (
    <div dir={dir}>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t("title")}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("subtitle")}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {([["wallArea", t("wallArea")], ["ceilingArea", t("ceilingArea")], ["coats", t("coats")], ["coveragePerLiter", t("coverage")]] as const).map(([field, label]) => (
          <div key={field}>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
            <input type="number" step="0.01" value={input[field] || ""} onChange={set(field)} className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono" />
          </div>
        ))}
      </div>

      <button onClick={loadExample} className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors mb-4">{t("example")}</button>

      {result && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { l: t("totalArea"), v: `${result.totalArea} م²` },
              { l: t("liters"), v: `${result.litersNeeded}` },
              { l: t("gallons"), v: `${result.gallonsNeeded}` },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
                <div className="text-[10px] text-gray-500 dark:text-gray-400">{item.l}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">{item.v}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={copyResult} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors">{copied ? "✓" : t("copy")}</button>
            <button onClick={share} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors">{t("share")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
