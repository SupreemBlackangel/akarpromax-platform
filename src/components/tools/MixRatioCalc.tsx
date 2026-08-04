"use client";

import { useCallback, useMemo, useState } from "react";
import { calcMixRatio, getMixRatios, type MixInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";

type Props = { locale: string };

const RATIO_LABELS: Record<string, Record<string, string>> = {
  "1:1.5:3": { ar: "1:1.5:3 (M30~35)", en: "1:1.5:3 (M30~35)", tr: "1:1.5:3 (M30~35)" },
  "1:2:3": { ar: "1:2:3 (M25~30)", en: "1:2:3 (M25~30)", tr: "1:2:3 (M25~30)" },
  "1:2:4": { ar: "1:2:4 (M20~25)", en: "1:2:4 (M20~25)", tr: "1:2:4 (M20~25)" },
  "1:3:6": { ar: "1:3:6 (M10~15)", en: "1:3:6 (M10~15)", tr: "1:3:6 (M10~15)" },
};

export function MixRatioCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<MixInput>("mix", { volumeM3: 0, ratio: [1, 2, 4] });
  const [copied, setCopied] = useState(false);
  const ratios = getMixRatios();

  const result = useMemo(() => {
    if (input.volumeM3 <= 0) return null;
    return calcMixRatio(input);
  }, [input]);

  const share = useUrlShare({ v: input.volumeM3, r: input.ratio.join(":") });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `الخلطة ${input.ratio.join(":")}: أسمنت ${result.cementTons} طن (${result.cementBags} كيس) | رمل ${result.sandTons} طن | زלط ${result.gravelTons} طن`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }, [result, input]);

  const loadExample = () => setInput({ volumeM3: 10, ratio: [1, 2, 4] });

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة نسب الخلطة" : "Mix Ratio Calculator",
      subtitle: locale === "ar" ? "حساب كمية الأسمنت والرمل والزلط بالطن والمتر المكعب" : "Calculate cement, sand & gravel in tons/m³",
      volume: locale === "ar" ? "حجم الخلطة (م³)" : "Mix Volume (m³)",
      ratio: locale === "ar" ? "نسبة الخلط" : "Mix Ratio",
      cement: locale === "ar" ? "الأسمنت (طن)" : "Cement (tons)",
      cementBags: locale === "ar" ? "أكياس الأسمنت" : "Cement Bags",
      sand: locale === "ar" ? "الرمل (طن)" : "Sand (tons)",
      gravel: locale === "ar" ? "الزلط (طن)" : "Gravel (tons)",
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
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("volume")}</label>
          <input type="number" step="0.1" value={input.volumeM3 || ""} onChange={(e) => { const v = parseFloat(e.target.value); setInput({ ...input, volumeM3: isNaN(v) ? 0 : v }); }} className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("ratio")}</label>
          <select
            value={input.ratio.join(":")}
            onChange={(e) => { const r = ratios[e.target.value]; if (r) setInput({ ...input, ratio: r }); }}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
          >
            {Object.keys(ratios).map((key) => (
              <option key={key} value={key}>{RATIO_LABELS[key]?.[locale] ?? key}</option>
            ))}
          </select>
        </div>
      </div>

      <button onClick={loadExample} className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors mb-4">{t("example")}</button>

      {result && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { l: t("cement"), v: `${result.cementTons}` },
              { l: t("cementBags"), v: `${result.cementBags}` },
              { l: t("sand"), v: `${result.sandTons}` },
              { l: t("gravel"), v: `${result.gravelTons}` },
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
