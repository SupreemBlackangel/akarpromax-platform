"use client";

import { useState } from "react";
import Link from "next/link";
import { translations } from "@/src/data/translations";
import type { Locale } from "@/src/types/site";
import { ToolsGate } from "@/src/components/tools/ToolsGate";
import { ConcreteCalc } from "@/src/components/tools/ConcreteCalc";
import { BeamCalc } from "@/src/components/tools/BeamCalc";
import { TileCalc } from "@/src/components/tools/TileCalc";
import { BrickCalc } from "@/src/components/tools/BrickCalc";
import { RebarCalc } from "@/src/components/tools/RebarCalc";
import { PaintCalc } from "@/src/components/tools/PaintCalc";
import { SlopeCalc } from "@/src/components/tools/SlopeCalc";
import { MixRatioCalc } from "@/src/components/tools/MixRatioCalc";

type ToolId = "concrete" | "beam" | "tile" | "brick" | "rebar" | "paint" | "slope" | "mix";

const TOOLS: Array<{ id: ToolId; icon: string; ar: string; en: string; tr: string }> = [
  { id: "concrete", icon: "🧱", ar: "خرسانة مسلحة", en: "Concrete", tr: "Beton" },
  { id: "beam", icon: "🏗️", ar: "كمرات/جسور", en: "Beams", tr: "Kirişler" },
  { id: "tile", icon: "🪨", ar: "بلاط", en: "Tiles", tr: "Fayans" },
  { id: "brick", icon: "🧱", ar: "طوب/طابوق", en: "Bricks", tr: "Tuğla" },
  { id: "rebar", icon: "🔩", ar: "حديد تسليح", en: "Rebar", tr: "Demir" },
  { id: "paint", icon: "🎨", ar: "دهان", en: "Paint", tr: "Boya" },
  { id: "slope", icon: "📐", ar: "ميل/انحدار", en: "Slope", tr: "Eğim" },
  { id: "mix", icon: "⚗️", ar: "نسب الخلطة", en: "Mix Ratio", tr: "Karışım" },
];

export function ToolsPageClient() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [activeTool, setActiveTool] = useState<ToolId>("concrete");
  const dir = locale === "ar" ? "rtl" : "ltr";

  const t = (key: string): string => {
    const val = translations[locale][key as keyof typeof translations["ar"]];
    return typeof val === "string" ? val : key;
  };

  const toolLabel = (tool: typeof TOOLS[0]) => locale === "ar" ? tool.ar : locale === "tr" ? tool.tr : tool.en;

  return (
    <div dir={dir} className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">🛠️ {locale === "ar" ? "الأدوات الهندسية" : "Engineering Tools"}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{locale === "ar" ? "أدوات احترافية للمهندسين والمقاولين" : "Professional tools for engineers & contractors"}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">
            <option value="ar">العربية</option>
            <option value="en">English</option>
            <option value="tr">Türkçe</option>
          </select>
          <Link href="/" className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">
            {t("home.brandTitle")}
          </Link>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <ToolsGate locale={locale}>
          {/* Card Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`p-4 rounded-xl text-center transition-all border ${
                  activeTool === tool.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md"
                }`}
              >
                <div className="text-2xl mb-2">{tool.icon}</div>
                <div className={`text-sm font-semibold ${activeTool === tool.id ? "text-white" : "text-gray-900 dark:text-white"}`}>
                  {toolLabel(tool)}
                </div>
              </button>
            ))}
          </div>

          {/* Active Tool */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            {activeTool === "concrete" && <ConcreteCalc locale={locale} />}
            {activeTool === "beam" && <BeamCalc locale={locale} />}
            {activeTool === "tile" && <TileCalc locale={locale} />}
            {activeTool === "brick" && <BrickCalc locale={locale} />}
            {activeTool === "rebar" && <RebarCalc locale={locale} />}
            {activeTool === "paint" && <PaintCalc locale={locale} />}
            {activeTool === "slope" && <SlopeCalc locale={locale} />}
            {activeTool === "mix" && <MixRatioCalc locale={locale} />}
          </div>
        </ToolsGate>
      </main>
    </div>
  );
}
