"use client";

import { useCallback, useMemo, useRef, useState } from "react";

type Props = { locale: string };

type Point = { id: string; x: number; y: number; z: number };

function parseTxtContent(content: string): Point[] {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const points: Point[] = [];

  for (const line of lines) {
    const parts = line.split(/[\s,;\t|]+/).filter(Boolean);
    if (parts.length < 2) continue;

    let x: number, y: number, z: number, id: string;

    const nums = parts.map(Number);
    const allNums = nums.filter((n) => !isNaN(n));

    if (allNums.length >= 3) {
      if (isNaN(nums[0]) && allNums.length >= 3) {
        id = parts[0];
        x = allNums[0];
        y = allNums[1];
        z = allNums[2];
      } else if (!isNaN(nums[0]) && allNums.length === 3) {
        id = String(points.length + 1);
        x = allNums[0];
        y = allNums[1];
        z = allNums[2];
      } else if (!isNaN(nums[0]) && allNums.length >= 2) {
        id = String(points.length + 1);
        x = allNums[0];
        y = allNums[1];
        z = allNums[2] ?? 0;
      } else {
        continue;
      }
    } else if (allNums.length === 2) {
      id = String(points.length + 1);
      x = allNums[0];
      y = allNums[1];
      z = 0;
    } else {
      continue;
    }

    if (x !== undefined && y !== undefined && !isNaN(x) && !isNaN(y)) {
      points.push({ id, x, y, z: z ?? 0 });
    }
  }

  return points;
}

function generateDxf(points: Point[], includeLabels: boolean, closePolygon: boolean): string {
  const lines: string[] = [];

  const dxfLine = (code: number, value: string | number) => {
    lines.push(String(code));
    lines.push(String(value));
  };

  dxfLine(0, "SECTION");
  dxfLine(2, "HEADER");
  dxfLine(9, "$ACADVER");
  dxfLine(1, "AC1009");
  dxfLine(9, "$INSBASE");
  dxfLine(10, "0.0");
  dxfLine(20, "0.0");
  dxfLine(30, "0.0");
  dxfLine(9, "$EXTMIN");
  dxfLine(10, "0.0");
  dxfLine(20, "0.0");
  dxfLine(9, "$EXTMAX");
  dxfLine(10, "1000.0");
  dxfLine(20, "1000.0");
  dxfLine(0, "ENDSEC");

  dxfLine(0, "SECTION");
  dxfLine(2, "TABLES");
  dxfLine(0, "TABLE");
  dxfLine(2, "LAYER");
  dxfLine(70, 3);

  dxfLine(0, "LAYER");
  dxfLine(2, "POINTS");
  dxfLine(70, 0);
  dxfLine(62, 1);
  dxfLine(6, "CONTINUOUS");

  dxfLine(0, "LAYER");
  dxfLine(2, "POLYGON");
  dxfLine(70, 0);
  dxfLine(62, 5);
  dxfLine(6, "CONTINUOUS");

  dxfLine(0, "LAYER");
  dxfLine(2, "LABELS");
  dxfLine(70, 0);
  dxfLine(62, 7);
  dxfLine(6, "CONTINUOUS");

  dxfLine(0, "ENDTAB");
  dxfLine(0, "ENDSEC");

  dxfLine(0, "SECTION");
  dxfLine(2, "ENTITIES");

  for (const pt of points) {
    dxfLine(0, "POINT");
    dxfLine(8, "POINTS");
    dxfLine(10, pt.x);
    dxfLine(20, pt.y);
    dxfLine(30, pt.z);

    if (includeLabels) {
      dxfLine(0, "TEXT");
      dxfLine(8, "LABELS");
      dxfLine(10, pt.x);
      dxfLine(20, pt.y + 1);
      dxfLine(30, pt.z);
      dxfLine(40, 2.5);
      dxfLine(1, pt.id);
    }
  }

  if (points.length >= 2) {
    dxfLine(0, "LWPOLYLINE");
    dxfLine(8, "POLYGON");
    dxfLine(67, 0);
    dxfLine(70, closePolygon ? 1 : 0);
    dxfLine(90, points.length);
    for (const pt of points) {
      dxfLine(10, pt.x);
      dxfLine(20, pt.y);
    }
  }

  dxfLine(0, "ENDSEC");
  dxfLine(0, "EOF");

  return lines.join("\n");
}

export function PointsToDxf({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [txtContent, setTxtContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [includeLabels, setIncludeLabels] = useState(true);
  const [closePolygon, setClosePolygon] = useState(true);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const points = useMemo(() => {
    if (!txtContent.trim()) return [];
    return parseTxtContent(txtContent);
  }, [txtContent]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTxtContent(ev.target?.result as string);
    };
    reader.readAsText(file);
  }, []);

  const downloadDxf = useCallback(() => {
    if (points.length === 0) return;
    const dxf = generateDxf(points, includeLabels, closePolygon);
    const blob = new Blob([dxf], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ? fileName.replace(/\.\w+$/, ".dxf") : "points.dxf";
    a.click();
    URL.revokeObjectURL(url);
  }, [points, includeLabels, closePolygon, fileName]);

  const copyDxf = useCallback(() => {
    if (points.length === 0) return;
    const dxf = generateDxf(points, includeLabels, closePolygon);
    navigator.clipboard.writeText(dxf).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [points, includeLabels, closePolygon]);

  return (
    <div dir={dir} className="max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 text-center">
        {locale === "ar" ? "تحويل النقاط إلى DXF" : "Points → DXF Converter"}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
        {locale === "ar" ? "ارفع ملف TXT أو الصق النقاط وحولها إلى DXF R12" : "Upload TXT or paste points and convert to DXF R12"}
      </p>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv,.tsv,.dat,.xyz"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {locale === "ar" ? "📁 اختر ملف TXT" : "📁 Choose TXT file"}
          </button>
          {fileName && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{fileName}</span>
          )}
        </div>

        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          {locale === "ar" ? "أو الصق محتوى الملف" : "Or paste file content"}
        </label>
        <textarea
          value={txtContent}
          onChange={(e) => setTxtContent(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono"
          placeholder={"1 437000.00 2606000.00 50.0\n2 437050.00 2606020.00 50.5\n3 437100.00 2605980.00 49.8"}
        />

        <div className="flex flex-wrap gap-4 mt-3">
          <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={includeLabels} onChange={(e) => setIncludeLabels(e.target.checked)} className="rounded" />
            {locale === "ar" ? "إضافة أرقام النقاط" : "Add point labels"}
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={closePolygon} onChange={(e) => setClosePolygon(e.target.checked)} className="rounded" />
            {locale === "ar" ? "إغلاق المضلع" : "Close polygon"}
          </label>
        </div>
      </div>

      {points.length > 0 ? (
        <div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
              {locale === "ar" ? "تم العثور على" : "Found"} {points.length} {locale === "ar" ? "نقطة" : "points"}
            </div>
            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400">
                    <th className="text-left py-1">#</th>
                    <th className="text-left py-1">X (Easting)</th>
                    <th className="text-left py-1">Y (Northing)</th>
                    <th className="text-left py-1">Z</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((pt, i) => (
                    <tr key={i} className="border-t border-blue-100 dark:border-blue-800/30">
                      <td className="py-1 font-mono">{pt.id}</td>
                      <td className="py-1 font-mono">{pt.x.toFixed(3)}</td>
                      <td className="py-1 font-mono">{pt.y.toFixed(3)}</td>
                      <td className="py-1 font-mono">{pt.z.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={downloadDxf}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {locale === "ar" ? "⬇ تنزيل DXF" : "⬇ Download DXF"}
            </button>
            <button
              onClick={copyDxf}
              className="px-5 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg text-sm font-semibold transition-colors"
            >
              {copied ? "✓" : "📋"} {locale === "ar" ? "نسخ محتوى DXF" : "Copy DXF content"}
            </button>
          </div>
        </div>
      ) : txtContent.trim() ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4 text-sm text-center">
          {locale === "ar" ? "لم يتم التعرف على نقاط صالحة" : "No valid points recognized"}
        </div>
      ) : null}
    </div>
  );
}
