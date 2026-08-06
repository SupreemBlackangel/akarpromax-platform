"use client";

import { useCallback, useMemo, useState } from "react";
import type { CadDocumentModel, CadPoint, CadUnit } from "@/src/lib/cad/types";
import { validateCadDocument, sanitizeCadDocument, shoelaceArea } from "@/src/lib/cad/validation";
import { CadPreview } from "@/src/components/cad/CadPreview";
import { CadLayersPanel } from "@/src/components/cad/CadLayersPanel";
import { CadValidationSummary } from "@/src/components/cad/CadValidationSummary";
import { CadExportPanel } from "@/src/components/cad/CadExportPanel";
import { ToolFileDropzone } from "@/src/components/cad/ToolFileDropzone";

type Props = { locale: string };

type Point = { id: string; x: number; y: number; z: number };

function parseTxtContent(content: string): Point[] {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const points: Point[] = [];

  for (const line of lines) {
    const parts = line.split(/[\s,;\t|]+/).filter(Boolean);
    if (parts.length < 2) continue;

    const nums = parts.map(Number);
    const allNums = nums.filter((n) => !isNaN(n));
    if (allNums.length < 2) continue;

    let id: string;
    let x: number;
    let y: number;
    let z: number;

    if (isNaN(nums[0])) {
      id = parts[0];
      x = allNums[0];
      y = allNums[1];
      z = allNums[2] ?? 0;
    } else {
      id = String(points.length + 1);
      x = allNums[0];
      y = allNums[1];
      z = allNums[2] ?? 0;
    }

    if (!isNaN(x) && !isNaN(y)) {
      points.push({ id, x, y, z });
    }
  }

  return points;
}

function buildDocument(points: Point[], includeLabels: boolean, closePolygon: boolean, units: CadUnit): CadDocumentModel {
  const pts: CadPoint[] = points.map((p) => ({ x: p.x, y: p.y, z: p.z }));
  const entities: CadDocumentModel["entities"] = [];

  entities.push(...pts.map((p) => ({ type: "POINT" as const, layer: "SURVEY_POINTS", position: p })));

  if (points.length >= 2) {
    entities.push({ type: "LWPOLYLINE" as const, layer: "PROPERTY_LINES", points: pts, closed: closePolygon });
  }

  if (points.length >= 3) {
    entities.push({
      type: "HATCH" as const,
      layer: "HATCH",
      boundary: pts,
      pattern: "SOLID",
      scale: 1,
    });
  }

  if (includeLabels) {
    for (const p of points) {
      entities.push({
        type: "MTEXT" as const,
        layer: "TEXT",
        position: { x: p.x, y: p.y + (units === "mm" ? 100 : units === "cm" ? 10 : 1), z: p.z },
        height: units === "mm" ? 100 : units === "cm" ? 10 : units === "inch" ? 1 : units === "foot" ? 1 : 1,
        text: p.id,
        width: 50,
      });
    }
  }

  return {
    version: "2018",
    units,
    drawingName: "survey-points",
    coordinateSystem: "UTM",
    layers: [
      { name: "SURVEY_POINTS", color: 1, visible: true },
      { name: "PROPERTY_LINES", color: 5, visible: true },
      { name: "TEXT", color: 7, visible: true },
      { name: "HATCH", color: 3, visible: true },
      { name: "DIMENSIONS", color: 4, visible: true },
      { name: "BOUNDARY", color: 2, visible: true },
    ],
    entities,
  };
}

export function PointsToDxf({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [txtContent, setTxtContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [includeLabels, setIncludeLabels] = useState(true);
  const [closePolygon, setClosePolygon] = useState(true);
  const [units, setUnits] = useState<CadUnit>("m");
  const [copied, setCopied] = useState(false);

  const points = useMemo(() => {
    if (!txtContent.trim()) return [];
    return parseTxtContent(txtContent);
  }, [txtContent]);

  const document = useMemo<CadDocumentModel | null>(() => {
    if (points.length === 0) return null;
    return buildDocument(points, includeLabels, closePolygon, units);
  }, [points, includeLabels, closePolygon, units]);

  const issues = useMemo(() => (document ? validateCadDocument(document) : []), [document]);
  const area = useMemo(() => (points.length >= 3 ? shoelaceArea(points) : null), [points]);
  const cleanDoc = useMemo(() => (document ? sanitizeCadDocument(document) : null), [document]);

  const handleFiles = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTxtContent(ev.target?.result as string);
    };
    reader.readAsText(file);
  }, []);

  const copyDxf = useCallback(() => {
    if (!cleanDoc) return;
    navigator.clipboard.writeText(JSON.stringify(cleanDoc, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [cleanDoc]);

  return (
    <div dir={dir} className="tc-tool-inner">
      <h2 className="tc-tool-heading">
        {locale === "ar" ? "تحويل النقاط إلى DXF" : "Points → DXF"}
      </h2>
      <p className="tc-tool-sub">
        {locale === "ar"
          ? "ارفع ملف TXT/CSV أو الصق النقاط ثم صدّر ملف AutoCAD (DXF) أو PDF أو SVG"
          : "Upload a TXT/CSV file or paste points, then export to AutoCAD DXF, PDF or SVG"}
      </p>

      <ToolFileDropzone
        accept={[".txt", ".csv", ".tsv", ".dat", ".xyz"]}
        maxFiles={1}
        maxSizeMB={50}
        locale={locale}
        onFiles={handleFiles}
      />
      {fileName && <div className="tc-file-name">{fileName}</div>}

      <label className="tc-field-label">
        {locale === "ar" ? "أو الصق محتوى الملف" : "Or paste file content"}
      </label>
      <textarea
        value={txtContent}
        onChange={(e) => setTxtContent(e.target.value)}
        rows={6}
        dir="ltr"
        className="tc-textarea"
        placeholder={"1 437000.00 2606000.00 50.0\n2 437050.00 2606020.00 50.5\n3 437100.00 2605980.00 49.8"}
      />

      <div className="tc-settings-row">
        <label className="cad-field">
          <span>{locale === "ar" ? "الوحدة" : "Units"}</span>
          <select className="tc-select" value={units} onChange={(e) => setUnits(e.target.value as CadUnit)}>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="m">m</option>
            <option value="inch">inch</option>
            <option value="foot">foot</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={includeLabels} onChange={(e) => setIncludeLabels(e.target.checked)} />
          {locale === "ar" ? "أرقام النقاط" : "Point labels"}
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={closePolygon} onChange={(e) => setClosePolygon(e.target.checked)} />
          {locale === "ar" ? "إغلاق المضلع" : "Close polygon"}
        </label>
      </div>

      {points.length > 0 && (
        <div className="tc-points-summary">
          <span>
            {locale === "ar" ? "النقاط" : "Points"}: <strong>{points.length}</strong>
          </span>
          {area !== null && (
            <span>
              {locale === "ar" ? "المساحة" : "Area"}: <strong>{area.toFixed(3)} {units}²</strong>
            </span>
          )}
        </div>
      )}

      {cleanDoc && (
        <>
          <CadValidationSummary issues={issues} locale={locale} />
          <CadLayersPanel
            layers={cleanDoc.layers}
            locale={locale}
            onToggle={(name, visible) => {
              const layer = cleanDoc.layers.find((l) => l.name === name);
              if (layer) layer.visible = visible;
            }}
            onColorChange={(name, color) => {
              const layer = cleanDoc.layers.find((l) => l.name === name);
              if (layer) layer.color = color;
            }}
          />
          <CadPreview document={cleanDoc} locale={locale} />
          <CadExportPanel document={cleanDoc} locale={locale} />
          <button type="button" className="tc-copy-btn" onClick={copyDxf}>
            {copied ? "✓" : "📋"} {locale === "ar" ? "نسخ نموذج الرسم (JSON)" : "Copy drawing model (JSON)"}
          </button>
        </>
      )}

      {!cleanDoc && txtContent.trim() && (
        <div className="tc-empty-inline">
          {locale === "ar" ? "لم يتم التعرف على نقاط صالحة" : "No valid points recognized"}
        </div>
      )}
    </div>
  );
}
