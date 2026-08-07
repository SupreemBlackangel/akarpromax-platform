"use client";

import { useCallback, useMemo } from "react";
import { calcRebar, type RebarInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { ToolCalculatorShell } from "./ToolCalculatorShell";
import { ToolNumericInput } from "./ToolNumericInput";
import { ToolSelectInput } from "./ToolSelectInput";
import { ToolResultCard } from "./ToolResultCard";
import { ToolSecondaryActions } from "./ToolSecondaryActions";

type Props = { locale: string };

const BAR_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32];

export function RebarCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<RebarInput>("rebar", { barDiameter: 12, barLength: 12, count: 1 });

  const result = useMemo(() => calcRebar(input), [input]);

  const share = useUrlShare({ d: input.barDiameter, l: input.barLength, n: input.count });

  const copyResult = useCallback(() => {
    const text = `حديد Ø${input.barDiameter}: وزن السيخ ${result.barWeight} كغ/م | الكلي: ${result.totalWeightKg} كغ (${result.totalWeightTons} طن)`;
    navigator.clipboard.writeText(text);
  }, [result, input]);

  const set = (field: keyof RebarInput) => (v: number) => setInput({ ...input, [field]: v });

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة حديد التسليح" : "Rebar Weight Calculator",
      subtitle: locale === "ar" ? "وزن السيخ الواحد والوزن الكلي بالمعادلة d²/162" : "Single bar weight & total using d²/162",
      diameter: locale === "ar" ? "قطر السيخ" : "Bar Diameter",
      length: locale === "ar" ? "طول السيخ" : "Bar Length",
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
    <ToolCalculatorShell title={t("title")} subtitle={`${t("subtitle")} — ${t("formula")}`} dir={dir}>
      <form className="grid grid-cols-3 gap-3 mb-3" onSubmit={(e) => e.preventDefault()}>
        <ToolSelectInput
          label={t("diameter")}
          value={input.barDiameter}
          onChange={(v) => setInput({ ...input, barDiameter: Number(v) })}
          options={BAR_SIZES.map((d) => ({ value: d, label: `Ø${d}` }))}
        />
        <ToolNumericInput label={t("length")} unit="m" step="0.5" min={0} value={input.barLength} onChange={set("barLength")} />
        <ToolNumericInput label={t("count")} step="1" min={1} inputMode="numeric" value={input.count} onChange={set("count")} />
      </form>

      <button
        type="button"
        onClick={() => setInput({ barDiameter: 16, barLength: 12, count: 50 })}
        className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {t("example")}
      </button>

      <div className="mt-4 space-y-3">
        <ToolResultCard
          metrics={[
            { label: t("barWeight"), value: `${result.barWeight}` },
            { label: t("totalKg"), value: `${result.totalWeightKg}`, primary: true },
            { label: t("totalTons"), value: `${result.totalWeightTons}` },
          ]}
        />
        <ToolSecondaryActions
          actions={[
            { label: t("copy"), onClick: copyResult },
            { label: t("share"), onClick: share },
          ]}
        />
      </div>
    </ToolCalculatorShell>
  );
}
