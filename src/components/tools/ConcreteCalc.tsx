"use client";

import { useCallback, useMemo, useState } from "react";
import { calcConcrete, type ConcreteInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { NumInput } from "./NumInput";

type Props = { locale: string };

const EXAMPLE: ConcreteInput = { length: 5, width: 3, thickness: 0.2 };

export function ConcreteCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<ConcreteInput>("concrete", { length: 0, width: 0, thickness: 0 });
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (input.length <= 0 || input.width <= 0 || input.thickness <= 0) return null;
    return calcConcrete(input);
  }, [input]);

  const share = useUrlShare({ l: input.length, w: input.width, t: input.thickness });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `الخرسانة: ${result.volumeM3} م³ | أسمنت: ${result.cementBags} كيس | رمل: ${result.sandTons} طن | حصى: ${result.gravelTons} طن | ماء: ${result.waterLiters} لتر`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }, [result]);

  const downloadTxt = useCallback(() => {
    if (!result) return;
    const text = `=== حاسبة الخرسانة المسلحة ===\nالطول: ${input.length} م | العرض: ${input.width} م | السماكة: ${input.thickness} م\n\nالحجم: ${result.volumeM3} م³\nأكياس الأسمنت (50كغ): ${result.cementBags}\nالرمل: ${result.sandTons} طن\nالحصى: ${result.gravelTons} طن\nالماء: ${result.waterLiters} لتر`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "concrete-result.txt"; a.click();
  }, [result, input]);

  const set = (field: keyof ConcreteInput) => (v: number) => setInput({ ...input, [field]: v });

  const labels = {
    title: locale === "ar" ? "حاسبة الخرسانة المسلحة" : "Reinforced Concrete Calculator",
    subtitle: locale === "ar" ? "حساب حجم الخرسانة وأكياس الأسمنت والرمل والحصى" : "Calculate concrete volume, cement bags, sand & gravel",
    length: locale === "ar" ? "الطول (م)" : "Length (m)",
    width: locale === "ar" ? "العرض (م)" : "Width (m)",
    thickness: locale === "ar" ? "السماكة (م)" : "Thickness (m)",
    volume: locale === "ar" ? "حجم الخرسانة" : "Concrete Volume",
    cement: locale === "ar" ? "أكياس الأسمنت (50 كغ)" : "Cement Bags (50 kg)",
    sand: locale === "ar" ? "الرمل (طن)" : "Sand (tons)",
    gravel: locale === "ar" ? "الحصى (طن)" : "Gravel (tons)",
    water: locale === "ar" ? "الماء (لتر)" : "Water (liters)",
    example: locale === "ar" ? "مثال" : "Example",
    copy: locale === "ar" ? "نسخ" : "Copy",
    download: locale === "ar" ? "تنزيل" : "Download",
    share: locale === "ar" ? "مشاركة" : "Share",
  };

  return (
    <div dir={dir}>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{labels.title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{labels.subtitle}</p>

      <form className="grid grid-cols-3 gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
        <NumInput label={labels.length} step="0.01" value={input.length} onChange={set("length")} />
        <NumInput label={labels.width} step="0.01" value={input.width} onChange={set("width")} />
        <NumInput label={labels.thickness} step="0.01" value={input.thickness} onChange={set("thickness")} />
      </form>

      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => setInput(EXAMPLE)} className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">{labels.example}</button>
      </div>

      {result && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: labels.volume, value: `${result.volumeM3} م³` },
              { label: labels.cement, value: `${result.cementBags}` },
              { label: labels.sand, value: `${result.sandTons}` },
              { label: labels.gravel, value: `${result.gravelTons}` },
              { label: labels.water, value: `${result.waterLiters}` },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
                <div className="text-[10px] text-gray-500 dark:text-gray-400">{item.label}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={copyResult} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors">{copied ? "✓" : labels.copy}</button>
            <button type="button" onClick={downloadTxt} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors">{labels.download}</button>
            <button type="button" onClick={share} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors">{labels.share}</button>
          </div>
        </div>
      )}
    </div>
  );
}
