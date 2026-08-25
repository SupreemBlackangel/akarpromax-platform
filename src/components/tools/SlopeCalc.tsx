"use client";

import { useCallback, useMemo } from "react";
import { calcSlope, type SlopeInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { ToolCalculatorShell } from "./ToolCalculatorShell";
import { ToolNumericInput } from "./ToolNumericInput";
import { ToolResultCard } from "./ToolResultCard";
import { ToolSecondaryActions } from "./ToolSecondaryActions";

type Props = { locale: string };

export function SlopeCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<SlopeInput>("slope", { heightDiff: 0, horizontalDistance: 0 });

  const result = useMemo(() => {
    if (input.horizontalDistance <= 0 && input.heightDiff <= 0) return null;
    return calcSlope(input);
  }, [input]);

  const share = useUrlShare({ h: input.heightDiff, d: input.horizontalDistance });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `الميل: ${result.slopePercent}% | النسبة: ${result.slopeRatio} | الزاوية: ${result.angleDegrees}° | ${result.slopeCategory}`;
    navigator.clipboard.writeText(text);
  }, [result]);

  const set = (field: keyof SlopeInput) => (v: number) => setInput({ ...input, [field]: v });

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة الميل والانحدار" : locale === "tr" ? "Eğim ve Gradyan Hesaplayıcı" : "Slope & Gradient Calculator",
      subtitle: locale === "ar" ? "حساب نسبة الميل بالدرجات ونسبة 1:X للمصارف والأسطح" : locale === "tr" ? "Eğim %, oran 1:X ve açıyı hesaplayın" : "Calculate slope %, ratio 1:X & angle for drains/surfaces",
      height: locale === "ar" ? "فرق الارتفاع" : locale === "tr" ? "Yükseklik Farkı" : "Height Difference",
      distance: locale === "ar" ? "المسافة الأفقية" : locale === "tr" ? "Yatay Mesafe" : "Horizontal Distance",
      percent: locale === "ar" ? "نسبة الميل" : locale === "tr" ? "Eğim %" : "Slope %",
      ratio: locale === "ar" ? "نسبة الميل" : locale === "tr" ? "Eğim Oranı" : "Slope Ratio",
      angle: locale === "ar" ? "زاوية الانحدار" : locale === "tr" ? "Eğim Açısı" : "Slope Angle",
      category: locale === "ar" ? "تصنيف الميل" : locale === "tr" ? "Eğim Kategorisi" : "Slope Category",
      copy: locale === "ar" ? "نسخ" : locale === "tr" ? "Kopyala" : "Copy",
      share: locale === "ar" ? "مشاركة" : locale === "tr" ? "Paylaş" : "Share",
    };
    return m[k] ?? k;
  };

  return (
    <ToolCalculatorShell title={t("title")} subtitle={t("subtitle")} dir={dir}>
      <form className="grid grid-cols-2 gap-3 mb-3" onSubmit={(e) => e.preventDefault()}>
        <ToolNumericInput label={t("height")} unit="m" step="0.01" min={0} value={input.heightDiff} onChange={set("heightDiff")} />
        <ToolNumericInput label={t("distance")} unit="m" step="0.01" min={0} value={input.horizontalDistance} onChange={set("horizontalDistance")} />
      </form>


      {result && (
        <div className="mt-4 space-y-3">
          <ToolResultCard
            metrics={[
              { label: t("percent"), value: `${result.slopePercent}%`, primary: true },
              { label: t("ratio"), value: result.slopeRatio },
              { label: t("angle"), value: `${result.angleDegrees}°` },
              { label: t("category"), value: result.slopeCategory },
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
