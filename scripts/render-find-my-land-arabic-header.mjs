import sharp from "sharp";

const outputPath = process.argv[2];
if (!outputPath) throw new Error("Arabic header output path is required");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="250" viewBox="0 0 1400 250">
  <rect width="1400" height="250" fill="white"/>
  <g fill="#173b74" font-family="Arial, sans-serif" font-size="48" direction="rtl" text-anchor="middle">
    <text x="700" y="80">ملف اختبار آمن بلا أسماء أو بيانات شخصية</text>
    <text x="700" y="165">تقرير مساحي لقطعة أرض - الإحداثيات العالمية</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(outputPath);
