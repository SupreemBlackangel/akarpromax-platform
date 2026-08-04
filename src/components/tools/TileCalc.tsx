"use client";

import { useCallback, useMemo, useState } from "react";
import { calcTile, type TileInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { NumInput } from "./NumInput";

type Props = { locale: string };

export function TileCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<TileInput>("tile", { roomLength: 0, roomWidth: 0, tileLength: 300, tileWidth: 300, wastePercent: 7 });
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (input.roomLength <= 0 || input.roomWidth <= 0 || input.tileLength <= 0 || input.tileWidth <= 0) return null;
    return calcTile(input);
  }, [input]);

  const share = useUrlShare({ rl: input.roomLength, rw: input.roomWidth, tl: input.tileLength, tw: input.tileWidth, w: input.wastePercent });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `البلاط: مساحة ${result.area} م² | عدد: ${result.tilesNeeded} بلاطة | لاصق: ${result.adhesiveBags} كيس | مونة: ${result.groutKg} كغ`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }, [result]);

  const set = (field: keyof TileInput) => (v: number) => setInput({ ...input, [field]: v });

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة البلاط" : "Tile Calculator",
      subtitle: locale === "ar" ? "حساب عدد البلاطات واللاصق والمهمل" : "Calculate tile count, adhesive & waste",
      rl: locale === "ar" ? "طول الغرفة (م)" : "Room Length (m)",
      rw: locale === "ar" ? "عرض الغرفة (م)" : "Room Width (m)",
      tl: locale === "ar" ? "طول البلاطة (مم)" : "Tile Length (mm)",
      tw: locale === "ar" ? "عرض البلاطة (مم)" : "Tile Width (mm)",
      waste: locale === "ar" ? "نسبة الهالك %" : "Waste %",
      area: locale === "ar" ? "المساحة" : "Area",
      tiles: locale === "ar" ? "عدد البلاطات" : "Tiles Needed",
      adhesive: locale === "ar" ? "أكياس اللاصق" : "Adhesive Bags",
      grout: locale === "ar" ? "مونة (كغ)" : "Grout (kg)",
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
        <NumInput label={t("rl")} step="0.01" value={input.roomLength} onChange={set("roomLength")} />
        <NumInput label={t("rw")} step="0.01" value={input.roomWidth} onChange={set("roomWidth")} />
        <NumInput label={t("tl")} step="1" value={input.tileLength} onChange={set("tileLength")} />
        <NumInput label={t("tw")} step="1" value={input.tileWidth} onChange={set("tileWidth")} />
        <NumInput label={t("waste")} step="1" value={input.wastePercent} onChange={set("wastePercent")} />
      </form>

      <button type="button" onClick={() => setInput({ roomLength: 4, roomWidth: 3, tileLength: 600, tileWidth: 600, wastePercent: 7 })} className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors mb-4">{t("example")}</button>

      {result && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { l: t("area"), v: `${result.area} م²` },
              { l: t("tiles"), v: `${result.tilesNeeded}` },
              { l: t("adhesive"), v: `${result.adhesiveBags}` },
              { l: t("grout"), v: `${result.groutKg} كغ` },
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
