"use client";

import { useCallback, useMemo, useState } from "react";
import { calcSlope, type SlopeInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";

type Props = { locale: string };

export function SlopeCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<SlopeInput>("slope", { heightDiff: 0, horizontalDistance: 0 });
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (input.horizontalDistance <= 0 && input.heightDiff <= 0) return null;
    return calcSlope(input);
  }, [input]);

  const share = useUrlShare({ h: input.heightDiff, d: input.horizontalDistance });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `الميل: ${result.slopePercent}% | النسبة: ${result.slopeRatio} | الزاوية: ${result.angleDegrees}° | ${result.slopeCategory}`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }, [result]);

  const loadExample = () => setInput({ heightDiff: 0.3, horizontalDistance: 6 });
  const set = (field: keyof SlopeInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setInput({ ...input, [field]: isNaN(v) ? 0 : v });
  };

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة الميل والانحدار" : "Slope & Gradient Calculator",
      subtitle: locale === "ar" ? "حساب نسبة الميل بالدرجات ونسبة 1:X للمصارف والأسطح" : "Calculate slope %, ratio 1:X & angle for drains/surfaces",
      height: locale === "ar" ? "فرق الارتفاع (م)" : "Height Difference (m)",
      distance: locale === "ar" ? "المسافة الأفقية (م)" : "Horizontal Distance (m)",
      percent: locale === "ar" ? "نسبة الميل" : "Slope %",
      ratio: locale === "ar" ? "نسبة الميل" : "Slope Ratio",
      angle: locale === "ar" ? "زاوية الانحدار" : "Slope Angle",
      category: locale === "ar" ? "تصنيف الميل" : "Slope Category",
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

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("height")}</label>
          <input type="number" step="0.01" value={input.heightDiff || ""} onChange={set("heightDiff")} className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("distance")}</label>
          <input type="number" step="0.01" value={input.horizontalDistance || ""} onChange={set("horizontalDistance")} className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono" />
        </div>
      </div>

      <button onClick={loadExample} className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors mb-4">{t("example")}</button>

      {result && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { l: t("percent"), v: `${result.slopePercent}%` },
              { l: t("ratio"), v: result.slopeRatio },
              { l: t("angle"), v: `${result.angleDegrees}°` },
              { l: t("category"), v: result.slopeCategory },
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
