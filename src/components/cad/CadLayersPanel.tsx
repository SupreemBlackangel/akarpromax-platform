"use client";

import type { CadLayer } from "@/src/lib/cad/types";

type Props = {
  layers: CadLayer[];
  locale?: string;
  onToggle: (name: string, visible: boolean) => void;
  onColorChange: (name: string, color: number) => void;
};

export function CadLayersPanel({ layers, locale = "ar", onToggle, onColorChange }: Props) {
  const t = (ar: string, en: string) => (locale === "ar" ? ar : en);
  return (
    <div className="cad-panel">
      <h4 className="cad-panel-title">{t("الطبقات", "Layers")}</h4>
      <ul className="cad-layers-list">
        {layers.map((layer) => (
          <li className="cad-layer-row" key={layer.name}>
            <input
              type="checkbox"
              checked={layer.visible !== false}
              onChange={(e) => onToggle(layer.name, e.target.checked)}
              aria-label={t(`إظهار/إخفاء ${layer.name}`, `Toggle ${layer.name}`)}
            />
            <span className="cad-layer-swatch" style={{ background: colorToHex(layer.color) }} aria-hidden="true" />
            <span className="cad-layer-name">{layer.name}</span>
            <input
              type="number"
              min={1}
              max={255}
              value={typeof layer.color === "number" ? layer.color : 7}
              onChange={(e) => onColorChange(layer.name, Math.max(1, Math.min(255, Number(e.target.value) || 7)))}
              className="cad-layer-color"
              aria-label={t(`لون ${layer.name}`, `Color ${layer.name}`)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function colorToHex(color: CadLayer["color"]): string {
  const palette = ["", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ffffff", "#808080", "#aaaaaa"];
  if (typeof color === "number") return palette[color] ?? "#cccccc";
  return color;
}
