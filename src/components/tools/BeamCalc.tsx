"use client";

import { useCallback, useMemo, useState } from "react";
import { calcBeam, type BeamInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { NumInput } from "./NumInput";

type Props = { locale: string };

export function BeamCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<BeamInput>("beam", { b: 0, h: 0, length: 0 });
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (input.b <= 0 || input.h <= 0 || input.length <= 0) return null;
    return calcBeam(input);
  }, [input]);

  const share = useUrlShare({ b: input.b, h: input.h, l: input.length });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `الكمر: ${input.b}×${input.h} م | طول: ${input.length} م\nالحجم: ${result.volumeM3} م³ | أسياخ رئيسية: ${result.mainBars} | كانات: ${result.stirrups} | حديد: ${result.rebarKg} كغ`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }, [result, input]);

  const set = (field: keyof BeamInput) => (v: number) => setInput({ ...input, [field]: v });

  const t = (key: string) => {
    const map: Record<string, string> = {
      title: locale === "ar" ? "حاسبة الكمرات والجسور" : "Beam & Bridge Calculator",
      subtitle: locale === "ar" ? "حساب حجم الصب وعدد أسياخ التسليح والاستهلاك" : "Calculate pour volume, rebar count & consumption",
      b: locale === "ar" ? "العرض b (م)" : "Width b (m)",
      h: locale === "ar" ? "الارتفاع h (م)" : "Height h (m)",
      length: locale === "ar" ? "طول البحر (م)" : "Span length (m)",
      volume: locale === "ar" ? "حجم الصب" : "Pour Volume",
      mainBars: locale === "ar" ? "أسياخ رئيسية" : "Main Bars",
      stirrups: locale === "ar" ? "كانات" : "Stirrups",
      rebarKg: locale === "ar" ? "حديد (كغ)" : "Rebar (kg)",
      density: locale === "ar" ? "كثافة الحديد (كغ/م³)" : "Rebar Density (kg/m³)",
      example: locale === "ar" ? "مثال" : "Example",
      copy: locale === "ar" ? "نسخ" : "Copy",
      share: locale === "ar" ? "مشاركة" : "Share",
    };
    return map[key] ?? key;
  };

  return (
    <div dir={dir}>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t("title")}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("subtitle")}</p>

      <form className="grid grid-cols-3 gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
        <NumInput label={t("b")} step="0.01" value={input.b} onChange={set("b")} />
        <NumInput label={t("h")} step="0.01" value={input.h} onChange={set("h")} />
        <NumInput label={t("length")} step="0.01" value={input.length} onChange={set("length")} />
      </form>

      <button type="button" onClick={() => setInput({ b: 0.3, h: 0.6, length: 6 })} className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors mb-4">{t("example")}</button>

      {result && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {[
              { l: t("volume"), v: `${result.volumeM3} م³` },
              { l: t("mainBars"), v: `${result.mainBars}` },
              { l: t("stirrups"), v: `${result.stirrups}` },
              { l: t("rebarKg"), v: `${result.rebarKg}` },
              { l: t("density"), v: `${result.rebarDensity}` },
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
      )}
    </div>
  );
}
