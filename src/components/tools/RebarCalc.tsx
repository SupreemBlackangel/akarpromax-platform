"use client";

import { useCallback, useMemo, useState } from "react";
import { calcRebar, type RebarInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { NumInput } from "./NumInput";

type Props = { locale: string };

const BAR_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32];

export function RebarCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<RebarInput>("rebar", { barDiameter: 12, barLength: 12, count: 1 });
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => calcRebar(input), [input]);

  const share = useUrlShare({ d: input.barDiameter, l: input.barLength, n: input.count });

  const copyResult = useCallback(() => {
    const text = `حديد Ø${input.barDiameter}: وزن السيخ ${result.barWeight} كغ/م | الكلي: ${result.totalWeightKg} كغ (${result.totalWeightTons} طن)`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }, [result, input]);

  const set = (field: keyof RebarInput) => (v: number) => setInput({ ...input, [field]: v });

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة حديد التسليح" : "Rebar Weight Calculator",
      subtitle: locale === "ar" ? "وزن السيخ الواحد والوزن الكلي بالمعادلة d²/162" : "Single bar weight & total using d²/162",
      diameter: locale === "ar" ? "قطر السيخ (مم)" : "Bar Diameter (mm)",
      length: locale === "ar" ? "طول السيخ (م)" : "Bar Length (m)",
      count: locale === "ar" ? "عدد الأسياخ" : "Bar Count",
      barWeight: locale === "ar" ? "وزن السيخ (كغ/م)" : "Bar Weight (kg/m)",
      totalKg: locale === "ar" ? "الوزن الكلي (كغ)" : "Total Weight (kg)",
      totalTons: locale === "ar" ? "الوزن الكلي (طن)" : "Total Weight (tons)",
      formula: locale === "ar" ? "d² ÷ 162" : "d² ÷ 162",
      example: locale === "ar" ? "مثال" : "Example",
      copy: locale === "ar" ? "نسخ" : "Copy",
      share: locale === "ar" ? "مشاركة" : "Share",
    };
    return m[k] ?? k;
  };

  return (
    <div dir={dir}>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t("title")}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("subtitle")} — <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{t("formula")}</code></p>

      <form className="grid grid-cols-3 gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t("diameter")}</label>
          <select value={input.barDiameter} onChange={(e) => setInput({ ...input, barDiameter: Number(e.target.value) })} className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
            {BAR_SIZES.map((d) => <option key={d} value={d}>Ø{d}</option>)}
          </select>
        </div>
        <NumInput label={t("length")} step="0.5" value={input.barLength} onChange={set("barLength")} />
        <NumInput label={t("count")} step="1" value={input.count} onChange={set("count")} />
      </form>

      <button type="button" onClick={() => setInput({ barDiameter: 16, barLength: 12, count: 50 })} className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors mb-4">{t("example")}</button>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { l: t("barWeight"), v: `${result.barWeight}` },
            { l: t("totalKg"), v: `${result.totalWeightKg}` },
            { l: t("totalTons"), v: `${result.totalWeightTons}` },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
              <div className="text-[10px] text-gray-500 dark:text-gray-400">{item.l}</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">{item.v}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={copyResult} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors">{copied ? "✓" : t("copy")}</button>
          <button type="button" onClick={share} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors">{t("share")}</button>
        </div>
      </div>
    </div>
  );
}
