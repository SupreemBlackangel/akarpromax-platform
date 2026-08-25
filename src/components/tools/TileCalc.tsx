"use client";

import { useCallback, useMemo } from "react";
import { calcTile, type TileInput } from "@/src/lib/tools/engineering";
import { usePersistedState, useUrlShare } from "@/src/lib/tools/hooks";
import { ToolCalculatorShell } from "./ToolCalculatorShell";
import { ToolNumericInput } from "./ToolNumericInput";
import { ToolResultCard } from "./ToolResultCard";
import { ToolAdvancedOptions } from "./ToolAdvancedOptions";
import { ToolSecondaryActions } from "./ToolSecondaryActions";

type Props = { locale: string };

export function TileCalc({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [input, setInput] = usePersistedState<TileInput>("tile", {
    roomLength: 0, roomWidth: 0, tileLength: 300, tileWidth: 300, wastePercent: 7,
  });

  const result = useMemo(() => {
    if (input.roomLength <= 0 || input.roomWidth <= 0 || input.tileLength <= 0 || input.tileWidth <= 0) return null;
    return calcTile(input);
  }, [input]);

  const share = useUrlShare({ rl: input.roomLength, rw: input.roomWidth, tl: input.tileLength, tw: input.tileWidth, w: input.wastePercent });

  const copyResult = useCallback(() => {
    if (!result) return;
    const text = `البلاط: مساحة ${result.area} م² | عدد: ${result.tilesNeeded} بلاطة | لاصق: ${result.adhesiveBags} كيس | مونة: ${result.groutKg} كغ`;
    navigator.clipboard.writeText(text);
  }, [result]);

  const set = (field: keyof TileInput) => (v: number) => setInput({ ...input, [field]: v });

  const t = (k: string) => {
    const m: Record<string, string> = {
      title: locale === "ar" ? "حاسبة البلاط" : locale === "tr" ? "Seramik Hesaplayıcı" : "Tile Calculator",
      subtitle: locale === "ar" ? "حساب عدد البلاطات واللاصق والمهمل" : locale === "tr" ? "Seramik sayısı, yapıştırıcı ve fireyi hesaplayın" : "Calculate tile count, adhesive & waste",
      rl: locale === "ar" ? "طول الغرفة" : locale === "tr" ? "Oda Uzunluğu" : "Room Length",
      rw: locale === "ar" ? "عرض الغرفة" : locale === "tr" ? "Oda Genişliği" : "Room Width",
      waste: locale === "ar" ? "نسبة الهالك" : locale === "tr" ? "Fire %" : "Waste %",
      tileDim: locale === "ar" ? "أبعاد البلاطة" : locale === "tr" ? "Seramik Boyutları" : "Tile Dimensions",
      tl: locale === "ar" ? "طول البلاطة" : locale === "tr" ? "Seramik Uzunluğu" : "Tile Length",
      tw: locale === "ar" ? "عرض البلاطة" : locale === "tr" ? "Seramik Genişliği" : "Tile Width",
      area: locale === "ar" ? "المساحة" : locale === "tr" ? "Alan" : "Area",
      tiles: locale === "ar" ? "عدد البلاطات" : locale === "tr" ? "Gerekli Seramik Sayısı" : "Tiles Needed",
      adhesive: locale === "ar" ? "أكياس اللاصق" : locale === "tr" ? "Yapıştırıcı Torbaları" : "Adhesive Bags",
      grout: locale === "ar" ? "مونة (كغ)" : locale === "tr" ? "Derz Dolgusu (kg)" : "Grout (kg)",
      copy: locale === "ar" ? "نسخ" : locale === "tr" ? "Kopyala" : "Copy",
      share: locale === "ar" ? "مشاركة" : locale === "tr" ? "Paylaş" : "Share",
    };
    return m[k] ?? k;
  };

  return (
    <ToolCalculatorShell title={t("title")} subtitle={t("subtitle")} dir={dir}>
      <form className="grid grid-cols-2 gap-3 mb-3" onSubmit={(e) => e.preventDefault()}>
        <ToolNumericInput label={t("rl")} unit="m" step="0.01" min={0} value={input.roomLength} onChange={set("roomLength")} />
        <ToolNumericInput label={t("rw")} unit="m" step="0.01" min={0} value={input.roomWidth} onChange={set("roomWidth")} />
        <ToolNumericInput label={t("waste")} unit="%" step="1" min={0} max={100} value={input.wastePercent} onChange={set("wastePercent")} />
      </form>

      <ToolAdvancedOptions label={t("tileDim")}>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <ToolNumericInput label={t("tl")} unit="mm" step="1" min={1} value={input.tileLength} onChange={set("tileLength")} />
          <ToolNumericInput label={t("tw")} unit="mm" step="1" min={1} value={input.tileWidth} onChange={set("tileWidth")} />
        </div>
      </ToolAdvancedOptions>


      {result && (
        <div className="mt-4 space-y-3">
          <ToolResultCard
            metrics={[
              { label: t("area"), value: `${result.area} م²`, primary: true },
              { label: t("tiles"), value: `${result.tilesNeeded}` },
              { label: t("adhesive"), value: `${result.adhesiveBags}` },
              { label: t("grout"), value: `${result.groutKg} كغ` },
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
