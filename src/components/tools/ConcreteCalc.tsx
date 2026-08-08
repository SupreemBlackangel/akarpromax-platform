"use client";

import { useCallback, useMemo } from "react";
import { calcConcrete, type ConcreteInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { ToolCalculatorShell } from "./ToolCalculatorShell";
import { ToolNumericInput } from "./ToolNumericInput";
import { ToolResultCard } from "./ToolResultCard";
import { ToolSecondaryActions } from "./ToolSecondaryActions";

type Props = { locale: string };

const EXAMPLE: ConcreteInput = { length: 5, width: 3, thickness: 0.2 };

export function ConcreteCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<ConcreteInput>("concrete", { length: 0, width: 0, thickness: 0 });

  const result = useMemo(() => {
    if (input.length <= 0 || input.width <= 0 || input.thickness <= 0) return null;
    return calcConcrete(input);
  }, [input]);

  const share = useUrlShare({ l: input.length, w: input.width, t: input.thickness });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `الخرسانة: ${result.volumeM3} م³ | أسمنت: ${result.cementBags} كيس | رمل: ${result.sandTons} طن | حصى: ${result.gravelTons} طن | ماء: ${result.waterLiters} لتر`;
    navigator.clipboard.writeText(text);
  }, [result]);

  const downloadTxt = useCallback(() => {
    if (!result) return;
    const text = `=== حاسبة الخرسانة المسلحة ===\nالطول: ${input.length} م | العرض: ${input.width} م | السماكة: ${input.thickness} م\n\nالحجم: ${result.volumeM3} م³\nأكياس الأسمنت (50كغ): ${result.cementBags}\nالرمل: ${result.sandTons} طن\nالحصى: ${result.gravelTons} طن\nالماء: ${result.waterLiters} لتر`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "concrete-result.txt"; a.click();
  }, [result, input]);

  const set = (field: keyof ConcreteInput) => (v: number) => setInput({ ...input, [field]: v });

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة الخرسانة المسلحة" : locale === "tr" ? "Betonarme Hesaplayıcı" : "Reinforced Concrete Calculator",
      subtitle: locale === "ar" ? "حساب حجم الخرسانة وأكياس الأسمنت والرمل والحصى" : locale === "tr" ? "Beton hacmi, çimento torbaları, kum ve çakıl hesaplayın" : "Calculate concrete volume, cement bags, sand & gravel",
      length: locale === "ar" ? "الطول" : locale === "tr" ? "Uzunluk" : "Length",
      width: locale === "ar" ? "العرض" : locale === "tr" ? "Genişlik" : "Width",
      thickness: locale === "ar" ? "السماكة" : locale === "tr" ? "Kalınlık" : "Thickness",
      volume: locale === "ar" ? "حجم الخرسانة" : locale === "tr" ? "Beton Hacmi" : "Concrete Volume",
      cement: locale === "ar" ? "أكياس الأسمنت (50 كغ)" : locale === "tr" ? "Çimento Torbaları (50 kg)" : "Cement Bags (50 kg)",
      sand: locale === "ar" ? "الرمل (طن)" : locale === "tr" ? "Kum (ton)" : "Sand (tons)",
      gravel: locale === "ar" ? "الحصى (طن)" : locale === "tr" ? "Çakıl (ton)" : "Gravel (tons)",
      water: locale === "ar" ? "الماء (لتر)" : locale === "tr" ? "Su (litre)" : "Water (liters)",
      example: locale === "ar" ? "مثال" : locale === "tr" ? "Örnek" : "Example",
      copy: locale === "ar" ? "نسخ" : locale === "tr" ? "Kopyala" : "Copy",
      download: locale === "ar" ? "تنزيل" : locale === "tr" ? "İndir" : "Download",
      share: locale === "ar" ? "مشاركة" : locale === "tr" ? "Paylaş" : "Share",
    };
    return m[k] ?? k;
  };

  return (
    <ToolCalculatorShell title={t("title")} subtitle={t("subtitle")} dir={dir}>
      <form className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3" onSubmit={(e) => e.preventDefault()}>
        <ToolNumericInput label={t("length")} unit="m" step="0.01" min={0} value={input.length} onChange={set("length")} />
        <ToolNumericInput label={t("width")} unit="m" step="0.01" min={0} value={input.width} onChange={set("width")} />
        <ToolNumericInput label={t("thickness")} unit="m" step="0.01" min={0} value={input.thickness} onChange={set("thickness")} />
      </form>

      <button
        type="button"
        onClick={() => setInput(EXAMPLE)}
        className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {t("example")}
      </button>

      {result && (
        <div className="mt-4 space-y-3">
          <ToolResultCard
            metrics={[
              { label: t("volume"), value: `${result.volumeM3} م³`, primary: true },
              { label: t("cement"), value: `${result.cementBags}` },
              { label: t("sand"), value: `${result.sandTons}` },
              { label: t("gravel"), value: `${result.gravelTons}` },
              { label: t("water"), value: `${result.waterLiters}` },
            ]}
          />
          <ToolSecondaryActions
            actions={[
              { label: t("copy"), onClick: copyResult },
              { label: t("download"), onClick: downloadTxt },
              { label: t("share"), onClick: share },
            ]}
          />
        </div>
      )}
    </ToolCalculatorShell>
  );
}
