"use client";

import { useCallback, useMemo } from "react";
import { calcBrick, type BrickInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { ToolCalculatorShell } from "./ToolCalculatorShell";
import { ToolNumericInput } from "./ToolNumericInput";
import { ToolResultCard } from "./ToolResultCard";
import { ToolAdvancedOptions } from "./ToolAdvancedOptions";
import { ToolSecondaryActions } from "./ToolSecondaryActions";

type Props = { locale: string };

const EXAMPLE: BrickInput = { wallLength: 5, wallHeight: 3, brickLength: 250, brickWidth: 120, brickHeight: 60, mortarThickness: 10 };

export function BrickCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<BrickInput>("brick", {
    wallLength: 0, wallHeight: 0, brickLength: 250, brickWidth: 120, brickHeight: 60, mortarThickness: 10,
  });

  const result = useMemo(() => {
    if (input.wallLength <= 0 || input.wallHeight <= 0) return null;
    return calcBrick(input);
  }, [input]);

  const share = useUrlShare({
    wl: input.wallLength, wh: input.wallHeight,
    bl: input.brickLength, bw: input.brickWidth, bh: input.brickHeight, mt: input.mortarThickness,
  });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `الطوب: ${result.bricksNeeded} طوبة | أسمنت: ${result.cementBags} كيس | رمل: ${result.sandTons} طن`;
    navigator.clipboard.writeText(text);
  }, [result]);

  const set = (field: keyof BrickInput) => (v: number) => setInput({ ...input, [field]: v });

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة الطوب والطابوق" : locale === "tr" ? "Tuğla Hesaplayıcı" : "Brick Calculator",
      subtitle: locale === "ar" ? "حساب عدد الطوب والمونة والأسمنت والرمل" : locale === "tr" ? "Tuğla, harç, çimento ve kum sayısını hesaplayın" : "Calculate bricks, mortar, cement & sand",
      wl: locale === "ar" ? "طول الجدار" : locale === "tr" ? "Duvar Uzunluğu" : "Wall Length",
      wh: locale === "ar" ? "ارتفاع الجدار" : locale === "tr" ? "Duvar Yüksekliği" : "Wall Height",
      bl: locale === "ar" ? "طول الطوبة" : locale === "tr" ? "Tuğla Uzunluğu" : "Brick Length",
      bw: locale === "ar" ? "عرض الطوبة" : locale === "tr" ? "Tuğla Genişliği" : "Brick Width",
      bh: locale === "ar" ? "ارتفاع الطوبة" : locale === "tr" ? "Tuğla Yüksekliği" : "Brick Height",
      mt: locale === "ar" ? "سماكة المونة" : locale === "tr" ? "Harç Kalınlığı" : "Mortar Thickness",
      wallDim: locale === "ar" ? "أبعاد الجدار" : locale === "tr" ? "Duvar Boyutları" : "Wall Dimensions",
      brickDim: locale === "ar" ? "أبعاد الطوبة والمونة" : locale === "tr" ? "Tuğla ve Harç" : "Brick & Mortar",
      bricks: locale === "ar" ? "عدد الطوب" : locale === "tr" ? "Gerekli Tuğla Sayısı" : "Bricks Needed",
      cement: locale === "ar" ? "أكياس الأسمنت" : locale === "tr" ? "Çimento Torbaları" : "Cement Bags",
      sand: locale === "ar" ? "الرمل (طن)" : locale === "tr" ? "Kum (ton)" : "Sand (tons)",
      example: locale === "ar" ? "مثال" : locale === "tr" ? "Örnek" : "Example",
      copy: locale === "ar" ? "نسخ" : locale === "tr" ? "Kopyala" : "Copy",
      share: locale === "ar" ? "مشاركة" : locale === "tr" ? "Paylaş" : "Share",
    };
    return m[k] ?? k;
  };

  return (
    <ToolCalculatorShell title={t("title")} subtitle={t("subtitle")} dir={dir}>
      <form className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3" onSubmit={(e) => e.preventDefault()}>
        <ToolNumericInput label={t("wl")} unit="m" step="0.01" min={0} value={input.wallLength} onChange={set("wallLength")} />
        <ToolNumericInput label={t("wh")} unit="m" step="0.01" min={0} value={input.wallHeight} onChange={set("wallHeight")} />
      </form>

      <ToolAdvancedOptions label={t("brickDim")}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          <ToolNumericInput label={t("bl")} unit="mm" step="1" min={1} value={input.brickLength} onChange={set("brickLength")} />
          <ToolNumericInput label={t("bw")} unit="mm" step="1" min={1} value={input.brickWidth} onChange={set("brickWidth")} />
          <ToolNumericInput label={t("bh")} unit="mm" step="1" min={1} value={input.brickHeight} onChange={set("brickHeight")} />
          <ToolNumericInput label={t("mt")} unit="mm" step="1" min={0} value={input.mortarThickness} onChange={set("mortarThickness")} />
        </div>
      </ToolAdvancedOptions>

      <button
        type="button"
        onClick={() => setInput(EXAMPLE)}
        className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors mt-3 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {t("example")}
      </button>

      {result && (
        <div className="mt-4 space-y-3">
          <ToolResultCard
            metrics={[
              { label: t("bricks"), value: `${result.bricksNeeded}`, primary: true },
              { label: t("cement"), value: `${result.cementBags}` },
              { label: t("sand"), value: `${result.sandTons}` },
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
