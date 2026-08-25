"use client";

import { useCallback, useMemo } from "react";
import { calcPaint, type PaintInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { ToolCalculatorShell } from "./ToolCalculatorShell";
import { ToolNumericInput } from "./ToolNumericInput";
import { ToolResultCard } from "./ToolResultCard";
import { ToolAdvancedOptions } from "./ToolAdvancedOptions";
import { ToolSecondaryActions } from "./ToolSecondaryActions";

type Props = { locale: string };

export function PaintCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<PaintInput>("paint", { wallArea: 0, ceilingArea: 0, coats: 2, coveragePerLiter: 10 });

  const result = useMemo(() => {
    if (input.wallArea <= 0 && input.ceilingArea <= 0) return null;
    return calcPaint(input);
  }, [input]);

  const share = useUrlShare({ wa: input.wallArea, ca: input.ceilingArea, c: input.coats, cov: input.coveragePerLiter });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `الدهان: المساحة ${result.totalArea} م² | البويات: ${result.litersNeeded} لتر (${result.gallonsNeeded} جالون)`;
    navigator.clipboard.writeText(text);
  }, [result]);

  const set = (field: keyof PaintInput) => (v: number) => setInput({ ...input, [field]: v });

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة الدهان" : locale === "tr" ? "Boya Hesaplayıcı" : "Paint Calculator",
      subtitle: locale === "ar" ? "حساب استهلاك البويات بالجالون واللتر" : locale === "tr" ? "Boya tüketimini galon/litre cinsinden hesaplayın" : "Calculate paint consumption in gallons/liters",
      wallArea: locale === "ar" ? "مساحة الجدران" : locale === "tr" ? "Duvar Alanı" : "Wall Area",
      ceilingArea: locale === "ar" ? "مساحة السقف" : locale === "tr" ? "Tavan Alanı" : "Ceiling Area",
      coats: locale === "ar" ? "عدد الطبقات" : locale === "tr" ? "Kat Sayısı" : "Number of Coats",
      coverage: locale === "ar" ? "التغطية (لتر/م²)" : locale === "tr" ? "Kaplama (L/m²)" : "Coverage (L/m²)",
      totalArea: locale === "ar" ? "المساحة الكلية" : locale === "tr" ? "Toplam Alan" : "Total Area",
      liters: locale === "ar" ? "البويات (لتر)" : locale === "tr" ? "Boya (litre)" : "Paint (liters)",
      gallons: locale === "ar" ? "البويات (جالون)" : locale === "tr" ? "Boya (galon)" : "Paint (gallons)",
      copy: locale === "ar" ? "نسخ" : locale === "tr" ? "Kopyala" : "Copy",
      share: locale === "ar" ? "مشاركة" : locale === "tr" ? "Paylaş" : "Share",
    };
    return m[k] ?? k;
  };

  return (
    <ToolCalculatorShell title={t("title")} subtitle={t("subtitle")} dir={dir}>
      <form className="grid grid-cols-2 gap-3 mb-3" onSubmit={(e) => e.preventDefault()}>
        <ToolNumericInput label={t("wallArea")} unit="m²" step="0.01" min={0} value={input.wallArea} onChange={set("wallArea")} />
        <ToolNumericInput label={t("ceilingArea")} unit="m²" step="0.01" min={0} value={input.ceilingArea} onChange={set("ceilingArea")} />
      </form>

      <ToolAdvancedOptions label={locale === "ar" ? "خيارات الطلاء" : "Paint Options"}>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <ToolNumericInput label={t("coats")} step="1" min={1} inputMode="numeric" value={input.coats} onChange={set("coats")} />
          <ToolNumericInput label={t("coverage")} unit="L/m²" step="0.1" min={0.1} value={input.coveragePerLiter} onChange={set("coveragePerLiter")} />
        </div>
      </ToolAdvancedOptions>


      {result && (
        <div className="mt-4 space-y-3">
          <ToolResultCard
            metrics={[
              { label: t("totalArea"), value: `${result.totalArea} م²`, primary: true },
              { label: t("liters"), value: `${result.litersNeeded}` },
              { label: t("gallons"), value: `${result.gallonsNeeded}` },
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
