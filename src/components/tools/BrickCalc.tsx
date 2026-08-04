"use client";

import { useCallback, useMemo, useState } from "react";
import { calcBrick, type BrickInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { NumInput } from "./NumInput";

type Props = { locale: string };

export function BrickCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<BrickInput>("brick", { wallLength: 0, wallHeight: 0, brickLength: 250, brickWidth: 120, brickHeight: 60, mortarThickness: 10 });
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (input.wallLength <= 0 || input.wallHeight <= 0) return null;
    return calcBrick(input);
  }, [input]);

  const share = useUrlShare({ wl: input.wallLength, wh: input.wallHeight, bl: input.brickLength, bw: input.brickWidth, bh: input.brickHeight, mt: input.mortarThickness });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `الطوب: ${result.bricksNeeded} طوبة | أسمنت: ${result.cementBags} كيس | رمل: ${result.sandTons} طن`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }, [result]);

  const set = (field: keyof BrickInput) => (v: number) => setInput({ ...input, [field]: v });

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة الطوب والطابوق" : "Brick Calculator",
      subtitle: locale === "ar" ? "حساب عدد الطوب والمونة والأسمنت والرمل" : "Calculate bricks, mortar, cement & sand",
      wl: locale === "ar" ? "طول الجدار (م)" : "Wall Length (m)",
      wh: locale === "ar" ? "ارتفاع الجدار (م)" : "Wall Height (m)",
      bl: locale === "ar" ? "طول الطوبة (مم)" : "Brick Length (mm)",
      bw: locale === "ar" ? "عرض الطوبة (مم)" : "Brick Width (mm)",
      bh: locale === "ar" ? "ارتفاع الطوبة (مم)" : "Brick Height (mm)",
      mt: locale === "ar" ? "سماكة المونة (مم)" : "Mortar Thickness (mm)",
      bricks: locale === "ar" ? "عدد الطوب" : "Bricks Needed",
      cement: locale === "ar" ? "أكياس الأسمنت" : "Cement Bags",
      sand: locale === "ar" ? "الرمل (طن)" : "Sand (tons)",
      example: locale === "ar" ? "مثال" : "Example",
      copy: locale === "ar" ? "نسخ" : "Copy",
      share: locale === "ar" ? "مشاركة" : "Share",
    };
    return m[k] ?? k;
  };

  return (
    <div dir={dir}>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t("title")}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("subtitle")}</p>

      <form className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
        <NumInput label={t("wl")} step="0.01" value={input.wallLength} onChange={set("wallLength")} />
        <NumInput label={t("wh")} step="0.01" value={input.wallHeight} onChange={set("wallHeight")} />
        <NumInput label={t("bl")} step="1" value={input.brickLength} onChange={set("brickLength")} />
        <NumInput label={t("bw")} step="1" value={input.brickWidth} onChange={set("brickWidth")} />
        <NumInput label={t("bh")} step="1" value={input.brickHeight} onChange={set("brickHeight")} />
        <NumInput label={t("mt")} step="1" value={input.mortarThickness} onChange={set("mortarThickness")} />
      </form>

      <button type="button" onClick={() => setInput({ wallLength: 5, wallHeight: 3, brickLength: 250, brickWidth: 120, brickHeight: 60, mortarThickness: 10 })} className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors mb-4">{t("example")}</button>

      {result && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { l: t("bricks"), v: `${result.bricksNeeded}` },
              { l: t("cement"), v: `${result.cementBags}` },
              { l: t("sand"), v: `${result.sandTons}` },
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
