"use client";

import { useCallback, useMemo } from "react";
import { calcBeam, type BeamInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { ToolCalculatorShell } from "./ToolCalculatorShell";
import { ToolNumericInput } from "./ToolNumericInput";
import { ToolResultCard } from "./ToolResultCard";
import { ToolSecondaryActions } from "./ToolSecondaryActions";

type Props = { locale: string };

export function BeamCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<BeamInput>("beam", { b: 0, h: 0, length: 0 });

  const result = useMemo(() => {
    if (input.b <= 0 || input.h <= 0 || input.length <= 0) return null;
    return calcBeam(input);
  }, [input]);

  const share = useUrlShare({ b: input.b, h: input.h, l: input.length });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `الكمر: ${input.b}×${input.h} م | طول: ${input.length} م\nالحجم: ${result.volumeM3} م³ | أسياخ رئيسية: ${result.mainBars} | كانات: ${result.stirrups} | حديد: ${result.rebarKg} كغ`;
    navigator.clipboard.writeText(text);
  }, [result, input]);

  const set = (field: keyof BeamInput) => (v: number) => setInput({ ...input, [field]: v });

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة الكمرات والجسور" : "Beam & Bridge Calculator",
      subtitle: locale === "ar" ? "حساب حجم الصب وعدد أسياخ التسليح والاستهلاك" : "Calculate pour volume, rebar count & consumption",
      b: locale === "ar" ? "العرض b" : "Width b",
      h: locale === "ar" ? "الارتفاع h" : "Height h",
      length: locale === "ar" ? "طول البحر" : "Span length",
      volume: locale === "ar" ? "حجم الصب" : "Pour Volume",
      mainBars: locale === "ar" ? "أسياخ رئيسية" : "Main Bars",
      stirrups: locale === "ar" ? "كانات" : "Stirrups",
      rebarKg: locale === "ar" ? "حديد (كغ)" : "Rebar (kg)",
      density: locale === "ar" ? "كثافة الحديد (كغ/م³)" : "Rebar Density (kg/m³)",
      example: locale === "ar" ? "مثال" : "Example",
      copy: locale === "ar" ? "نسخ" : "Copy",
      share: locale === "ar" ? "مشاركة" : "Share",
    };
    return m[k] ?? k;
  };

  return (
    <ToolCalculatorShell title={t("title")} subtitle={t("subtitle")} dir={dir}>
      <form className="grid grid-cols-3 gap-3 mb-3" onSubmit={(e) => e.preventDefault()}>
        <ToolNumericInput label={t("b")} unit="m" step="0.01" min={0} value={input.b} onChange={set("b")} />
        <ToolNumericInput label={t("h")} unit="m" step="0.01" min={0} value={input.h} onChange={set("h")} />
        <ToolNumericInput label={t("length")} unit="m" step="0.01" min={0} value={input.length} onChange={set("length")} />
      </form>

      <button
        type="button"
        onClick={() => setInput({ b: 0.3, h: 0.6, length: 6 })}
        className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors min-h-[36px]"
      >
        {t("example")}
      </button>

      {result && (
        <div className="mt-4 space-y-3">
          <ToolResultCard
            metrics={[
              { label: t("volume"), value: `${result.volumeM3} م³`, primary: true },
              { label: t("mainBars"), value: `${result.mainBars}` },
              { label: t("stirrups"), value: `${result.stirrups}` },
              { label: t("rebarKg"), value: `${result.rebarKg}` },
              { label: t("density"), value: `${result.rebarDensity}` },
            ]}
          />
          <ToolSecondaryActions
            actions={[
              { label: t("copy"), onClick: copyResult },
              { label: t("share"), onClick: share },
            ]}
          />
        </div>
      )}
    </ToolCalculatorShell>
  );
}
