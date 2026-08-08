"use client";

import { useCallback, useMemo } from "react";
import { calcMixRatio, getMixRatios, type MixInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { ToolCalculatorShell } from "./ToolCalculatorShell";
import { ToolNumericInput } from "./ToolNumericInput";
import { ToolSelectInput } from "./ToolSelectInput";
import { ToolResultCard } from "./ToolResultCard";
import { ToolSecondaryActions } from "./ToolSecondaryActions";

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
  const ratios = getMixRatios();

  const result = useMemo(() => {
    if (input.volumeM3 <= 0) return null;
    return calcMixRatio(input);
  }, [input]);

  const share = useUrlShare({ v: input.volumeM3, r: input.ratio.join(":") });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `الخلطة ${input.ratio.join(":")}: أسمنت ${result.cementTons} طن (${result.cementBags} كيس) | رمل ${result.sandTons} طن | زلط ${result.gravelTons} طن`;
    navigator.clipboard.writeText(text);
  }, [result, input]);

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة نسب الخلطة" : locale === "tr" ? "Karışım Oranı Hesaplayıcı" : "Mix Ratio Calculator",
      subtitle: locale === "ar" ? "حساب كمية الأسمنت والرمل والزلط بالطن والمتر المكعب" : locale === "tr" ? "Çimento, kum ve çakıl ton/m³ cinsinden hesaplayın" : "Calculate cement, sand & gravel in tons/m³",
      volume: locale === "ar" ? "حجم الخلطة" : locale === "tr" ? "Karışım Hacmi" : "Mix Volume",
      ratio: locale === "ar" ? "نسبة الخلط" : locale === "tr" ? "Karışım Oranı" : "Mix Ratio",
      cement: locale === "ar" ? "الأسمنت (طن)" : locale === "tr" ? "Çimento (ton)" : "Cement (tons)",
      cementBags: locale === "ar" ? "أكياس الأسمنت" : locale === "tr" ? "Çimento Torbaları" : "Cement Bags",
      sand: locale === "ar" ? "الرمل (طن)" : locale === "tr" ? "Kum (ton)" : "Sand (tons)",
      gravel: locale === "ar" ? "الزلط (طن)" : locale === "tr" ? "Çakıl (ton)" : "Gravel (tons)",
      example: locale === "ar" ? "مثال" : locale === "tr" ? "Örnek" : "Example",
      copy: locale === "ar" ? "نسخ" : locale === "tr" ? "Kopyala" : "Copy",
      share: locale === "ar" ? "مشاركة" : locale === "tr" ? "Paylaş" : "Share",
    };
    return m[k] ?? k;
  };

  return (
    <ToolCalculatorShell title={t("title")} subtitle={t("subtitle")} dir={dir}>
      <form className="grid grid-cols-2 gap-3 mb-3" onSubmit={(e) => e.preventDefault()}>
        <ToolNumericInput label={t("volume")} unit="m³" step="0.1" min={0} value={input.volumeM3} onChange={(v) => setInput({ ...input, volumeM3: v })} />
        <ToolSelectInput
          label={t("ratio")}
          value={input.ratio.join(":")}
          onChange={(v) => { const r = ratios[String(v)]; if (r) setInput({ ...input, ratio: r }); }}
          options={Object.keys(ratios).map((key) => ({ value: key, label: RATIO_LABELS[key]?.[locale] ?? key }))}
        />
      </form>

      <button
        type="button"
        onClick={() => setInput({ volumeM3: 10, ratio: [1, 2, 4] })}
        className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {t("example")}
      </button>

      {result && (
        <div className="mt-4 space-y-3">
          <ToolResultCard
            metrics={[
              { label: t("cement"), value: `${result.cementTons}`, primary: true },
              { label: t("cementBags"), value: `${result.cementBags}` },
              { label: t("sand"), value: `${result.sandTons}` },
              { label: t("gravel"), value: `${result.gravelTons}` },
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
