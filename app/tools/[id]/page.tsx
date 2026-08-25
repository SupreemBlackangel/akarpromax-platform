'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { AdSidebar } from '@/components/advertising/placements/AdSidebar';

const toolsMap: Record<string, { name: string; icon: string; fields: { label: string; key: string; unit: string; type: string }[]; calculate: (values: Record<string, number>) => { label: string; value: string; unit: string }[] }> = {
  'find-my-land': {
    name: 'Find My Land', icon: '🗺️',
    fields: [
      { label: 'خط العرض', key: 'lat', unit: '°', type: 'number' },
      { label: 'خط الطول', key: 'lng', unit: '°', type: 'number' },
      { label: 'المساحة', key: 'area', unit: 'م²', type: 'number' },
    ],
    calculate: (v) => [{ label: 'المساحة', value: String(v.area || 0), unit: 'م²' }],
  },
  'coordinate': {
    name: 'تحويل الاحداثيات', icon: '📍',
    fields: [
      { label: 'خط العرض (UTM X)', key: 'x', unit: 'm', type: 'number' },
      { label: 'خط الطول (UTM Y)', key: 'y', unit: 'm', type: 'number' },
      { label: 'المنطقة', key: 'zone', unit: '', type: 'number' },
    ],
    calculate: (v) => [
      { label: 'WGS84 X', value: (v.x * 0.00001).toFixed(6), unit: '°' },
      { label: 'WGS84 Y', value: (v.y * 0.00001).toFixed(6), unit: '°' },
    ],
  },
  area: {
    name: 'حاسبة المساحة', icon: '📐',
    fields: [
      { label: 'الطول', key: 'length', unit: 'م', type: 'number' },
      { label: 'العرض', key: 'width', unit: 'م', type: 'number' },
      { label: 'الشكل', key: 'shape', unit: '', type: 'select' },
    ],
    calculate: (v) => [{ label: 'المساحة', value: (v.length * v.width).toFixed(2), unit: 'م²' }],
  },
  concrete: {
    name: 'حاسبة الخرسانة', icon: '🧱',
    fields: [
      { label: 'الطول', key: 'length', unit: 'م', type: 'number' },
      { label: 'العرض', key: 'width', unit: 'م', type: 'number' },
      { label: 'الارتفاع', key: 'height', unit: 'م', type: 'number' },
      { label: 'نسبة التصريف', key: 'waste', unit: '%', type: 'number' },
    ],
    calculate: (v) => {
      const vol = v.length * v.width * v.height;
      const waste = vol * ((v.waste || 5) / 100);
      const cement = (vol + waste) * 350;
      const sand = (vol + waste) * 0.7;
      const gravel = (vol + waste) * 1.2;
      return [
        { label: 'حجم الخرسانة', value: vol.toFixed(2), unit: 'م³' },
        { label: 'الاسمنت', value: cement.toFixed(0), unit: 'كجم' },
        { label: 'الرمل', value: sand.toFixed(2), unit: 'م³' },
        { label: 'الحصى', value: gravel.toFixed(2), unit: 'م³' },
      ];
    },
  },
  beam: {
    name: 'حاسبة الكمرات', icon: '📊',
    fields: [
      { label: 'الطول', key: 'length', unit: 'م', type: 'number' },
      { label: 'العرض', key: 'width', unit: 'م', type: 'number' },
      { label: 'الارتفاع', key: 'height', unit: 'م', type: 'number' },
      { label: 'عدد القضبان', key: 'bars', unit: '', type: 'number' },
    ],
    calculate: (v) => {
      const vol = v.length * v.width * v.height;
      const rebar = (v.bars || 4) * v.length * 1.5;
      return [
        { label: 'حجم الخرسانة', value: vol.toFixed(3), unit: 'م³' },
        { label: 'وزن التسليح', value: rebar.toFixed(1), unit: 'كجم' },
      ];
    },
  },
  tile: {
    name: 'حاسبة البلاط', icon: '🔲',
    fields: [
      { label: 'الطول', key: 'length', unit: 'م', type: 'number' },
      { label: 'العرض', key: 'width', unit: 'م', type: 'number' },
      { label: 'طول البلاطة', key: 'tileL', unit: 'سم', type: 'number' },
      { label: 'عرض البلاطة', key: 'tileW', unit: 'سم', type: 'number' },
    ],
    calculate: (v) => {
      const area = v.length * v.width;
      const tileArea = (v.tileL / 100) * (v.tileW / 100);
      const count = Math.ceil(area / tileArea);
      const waste = Math.ceil(count * 0.1);
      return [
        { label: 'المساحة', value: area.toFixed(2), unit: 'م²' },
        { label: 'عدد البلاط', value: String(count), unit: 'قطعة' },
        { label: 'النفايات', value: String(waste), unit: 'قطعة' },
        { label: 'الاجمالي', value: String(count + waste), unit: 'قطعة' },
      ];
    },
  },
  brick: {
    name: 'حاسبة الطوب', icon: '🧱',
    fields: [
      { label: 'الطول', key: 'length', unit: 'م', type: 'number' },
      { label: 'الارتفاع', key: 'height', unit: 'م', type: 'number' },
      { label: 'سمك الجدار', key: 'thickness', unit: 'سم', type: 'number' },
    ],
    calculate: (v) => {
      const area = v.length * v.height;
      const brickPerM2 = Math.ceil(1 / ((0.2 + 0.02) * (0.1 + 0.01)));
      const count = Math.ceil(area * brickPerM2);
      return [
        { label: 'المساحة', value: area.toFixed(2), unit: 'م²' },
        { label: 'عدد الطوب', value: String(count), unit: 'طوبة' },
        { label: 'النفايات', value: String(Math.ceil(count * 0.05)), unit: 'طوبة' },
      ];
    },
  },
  rebar: {
    name: 'حاسبة التسليح', icon: '⚙️',
    fields: [
      { label: 'الطول', key: 'length', unit: 'م', type: 'number' },
      { label: 'العرض', key: 'width', unit: 'م', type: 'number' },
      { label: 'قطر القضيب', key: 'diameter', unit: 'مم', type: 'number' },
      { label: 'المسافة بين القضبان', key: 'spacing', unit: 'سم', type: 'number' },
    ],
    calculate: (v) => {
      const lengthBars = Math.ceil(v.width / (v.spacing / 100)) + 1;
      const widthBars = Math.ceil(v.length / (v.spacing / 100)) + 1;
      const totalLength = lengthBars * v.length + widthBars * v.width;
      const weightPerM = (v.diameter * v.diameter) / 162;
      const totalWeight = totalLength * weightPerM;
      return [
        { label: 'عدد القضبان الطولية', value: String(lengthBars), unit: 'قضيب' },
        { label: 'عدد القضبان العرضية', value: String(widthBars), unit: 'قضيب' },
        { label: 'الطول الكلي', value: totalLength.toFixed(1), unit: 'م' },
        { label: 'الوزن', value: totalWeight.toFixed(1), unit: 'كجم' },
      ];
    },
  },
  paint: {
    name: 'حاسبة الدهان', icon: '🎨',
    fields: [
      { label: 'الطول', key: 'length', unit: 'م', type: 'number' },
      { label: 'الارتفاع', key: 'height', unit: 'م', type: 'number' },
      { label: 'عدد النوافذ', key: 'windows', unit: '', type: 'number' },
      { label: 'عدد الابواب', key: 'doors', unit: '', type: 'number' },
    ],
    calculate: (v) => {
      const wallArea = v.length * v.height * 2;
      const windowArea = (v.windows || 0) * 1.5;
      const doorArea = (v.doors || 0) * 2;
      const netArea = wallArea - windowArea - doorArea;
      const paint = Math.ceil(netArea / 10);
      return [
        { label: 'المساحة الصافية', value: netArea.toFixed(1), unit: 'م²' },
        { label: 'عدد العلب', value: String(paint), unit: 'علبة (5 لتر)' },
      ];
    },
  },
  slope: {
    name: 'حاسبة الميل', icon: '📈',
    fields: [
      { label: 'الارتفاع', key: 'rise', unit: 'م', type: 'number' },
      { label: 'المسافة', key: 'run', unit: 'م', type: 'number' },
    ],
    calculate: (v) => {
      const slope = (v.rise / v.run) * 100;
      const angle = Math.atan(v.rise / v.run) * (180 / Math.PI);
      return [
        { label: 'نسبة الميل', value: slope.toFixed(2), unit: '%' },
        { label: 'الزاوية', value: angle.toFixed(1), unit: '°' },
      ];
    },
  },
  mix: {
    name: 'نسب الخلط', icon: '🔄',
    fields: [
      { label: 'رتبة الخرسانة', key: 'grade', unit: '', type: 'select' },
      { label: 'حجم الخلطة', key: 'volume', unit: 'م³', type: 'number' },
    ],
    calculate: (v) => {
      const ratios: Record<string, { c: number; s: number; g: number }> = {
        '1:2:4': { c: 1, s: 2, g: 4 },
        '1:3:6': { c: 1, s: 3, g: 6 },
        '1:2.5:5': { c: 1, s: 2.5, g: 5 },
      };
      const r = ratios[String(v.grade)] || ratios['1:2:4'];
      const total = r.c + r.s + r.g;
      const cement = (v.volume * r.c) / total;
      const sand = (v.volume * r.s) / total;
      const gravel = (v.volume * r.g) / total;
      return [
        { label: 'الاسمنت', value: cement.toFixed(2), unit: 'كجم' },
        { label: 'الرمل', value: sand.toFixed(2), unit: 'كجم' },
        { label: 'الحصى', value: gravel.toFixed(2), unit: 'كجم' },
      ];
    },
  },
  calculator: {
    name: 'الة حاسبة', icon: '🧮',
    fields: [
      { label: 'القيمة', key: 'value', unit: '', type: 'number' },
    ],
    calculate: (v) => [{ label: 'القيمة', value: String(v.value || 0), unit: '' }],
  },
  pdf2word: { name: 'PDF الى Word', icon: '📄', fields: [], calculate: () => [] },
  points2dxf: { name: 'نقاط الى DXF', icon: '📏', fields: [], calculate: () => [] },
};

function ToolCalculator({ toolId, tool }: { toolId: string; tool: typeof toolsMap[string] }) {
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [results, setResults] = useState<{ label: string; value: string; unit: string }[]>([]);

  const handleCalculate = () => {
    const numValues: Record<string, number> = {};
    for (const [k, v] of Object.entries(values)) numValues[k] = typeof v === 'number' ? v : parseFloat(String(v)) || 0;
    setResults(tool.calculate(numValues));
  };

  if (tool.fields.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">هذه الأداة غير متوفرة حالياً</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
      <div className="space-y-4">
        {tool.fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            {field.type === 'select' ? (
              <select
                className="w-full border rounded-lg px-3 py-2"
                onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
              >
                <option value="1:2:4">1:2:4</option>
                <option value="1:3:6">1:3:6</option>
                <option value="1:2.5:5">1:2.5:5</option>
              </select>
            ) : (
              <input
                type="number"
                placeholder={field.unit}
                className="w-full border rounded-lg px-3 py-2"
                onChange={(e) => setValues({ ...values, [field.key]: parseFloat(e.target.value) || 0 })}
              />
            )}
          </div>
        ))}
        <button onClick={handleCalculate} className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">احسب</button>
      </div>
      {results.length > 0 && (
        <div className="mt-6 space-y-2">
          {results.map((r, i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">{r.label}</span>
              <span className="font-bold text-[var(--color-primary)]">{r.value} {r.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ToolPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const toolId = resolvedParams.id;
  const tool = toolsMap[toolId];
  const location = { country: 'السعودية', governorate: 'الرياض', city: 'الرياض' };

  if (!tool) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center"><h1 className="text-2xl font-bold mb-4">اداة غير موجودة</h1><Link href="/tools" className="text-[var(--color-primary)] hover:underline">العودة للادوات</Link></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/tools" className="text-[var(--color-primary)] hover:underline mb-4 inline-block">&larr; العودة للادوات</Link>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">{tool.icon}</span>
          <h1 className="text-2xl font-bold">{tool.name}</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-2">
            <AdSidebar page="tools" placement="left_01" country={location.country} governorate={location.governorate} city={location.city} />
          </div>
          <div className="lg:col-span-8">
            <ToolCalculator toolId={toolId} tool={tool} />
          </div>
          <div className="lg:col-span-2">
            <AdSidebar page="tools" placement="right_01" country={location.country} governorate={location.governorate} city={location.city} />
          </div>
        </div>
      </div>
    </div>
  );
}
