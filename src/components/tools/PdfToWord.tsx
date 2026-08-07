"use client";

import { useCallback, useRef, useState } from "react";
import { ToolCalculatorShell } from "./ToolCalculatorShell";

type Props = { locale: string };

type Stage = "idle" | "loading" | "extracting" | "ocr" | "generating" | "done" | "error";

export function PdfToWord({ locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDownloadUrl(null);
    setErrorMsg("");
    setStage("loading");
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const isImage = file.type.startsWith("image/");

      let textContent = "";

      if (isImage) {
        setStage("ocr");
        setProgress(10);
        const Tesseract = await import("tesseract.js");
        setProgress(20);
        const result = await Tesseract.recognize(file, "ara+eng", {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === "recognizing text") {
              setProgress(20 + Math.round(m.progress * 60));
            }
          },
        });
        textContent = result.data.text;
        setProgress(80);
      } else {
        setStage("extracting");
        setProgress(10);
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setProgress(20);

        const pageTexts: string[] = [];
        const maxPages = Math.min(pdf.numPages, 20);

        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pageText = (content.items as any[])
            .filter((item) => item.str)
            .map((item) => item.str as string)
            .join(" ");
          pageTexts.push(pageText);
          setProgress(20 + Math.round((i / maxPages) * 40));
        }

        textContent = pageTexts.join("\n\n");
        const charCount = textContent.replace(/\s/g, "").length;

        if (charCount < 30) {
          setStage("ocr");
          setProgress(60);
          const Tesseract = await import("tesseract.js");
          const ocrTexts: string[] = [];
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;
            const blob = await new Promise<Blob>((resolve) =>
              canvas.toBlob((b) => resolve(b!), "image/png")
            );
            const result = await Tesseract.recognize(blob, "ara+eng", {
              logger: (m: { status: string; progress: number }) => {
                if (m.status === "recognizing text") {
                  setProgress(60 + Math.round((i / maxPages) * 30));
                }
              },
            });
            ocrTexts.push(result.data.text);
          }
          textContent = ocrTexts.join("\n\n");
        }
      }

      setStage("generating");
      setProgress(90);

      const { Document: DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");

      const paragraphs = textContent
        .split(/\n\n+/)
        .filter((p) => p.trim())
        .map(
          (p) =>
            new Paragraph({
              children: [
                new TextRun({
                  text: p.trim(),
                  font: "Arial",
                  size: 24,
                }),
              ],
              spacing: { after: 200 },
            }),
        );

      const doc = new DocxDocument({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: file.name.replace(/\.\w+$/, ""),
                    font: "Arial",
                    size: 32,
                    bold: true,
                  }),
                ],
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
              }),
              ...paragraphs,
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStage("done");
      setProgress(100);
    } catch (err) {
      setStage("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const stageLabels: Record<Stage, string> = {
    idle: "",
    loading: locale === "ar" ? "جارٍ تحميل الملف..." : "Loading file...",
    extracting: locale === "ar" ? "جارٍ استخراج النص من PDF..." : "Extracting text from PDF...",
    ocr: locale === "ar" ? "جارٍ التعرف على النص بالـ OCR..." : "Running OCR text recognition...",
    generating: locale === "ar" ? "جارٍ توليد مستند Word..." : "Generating Word document...",
    done: locale === "ar" ? "تم بنجاح!" : "Done!",
    error: locale === "ar" ? "حدث خطأ" : "Error occurred",
  };

  return (
    <ToolCalculatorShell
      title={locale === "ar" ? "تحويل PDF إلى Word" : "PDF → Word Converter"}
      subtitle={locale === "ar" ? "ارفع ملف PDF أو صورة واحصل على مستند Word" : "Upload a PDF or image and get a Word document"}
      dir={dir}
    >
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.webp"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={stage !== "idle" && stage !== "done" && stage !== "error"}
            className="w-full px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-semibold transition-colors min-h-[48px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {locale === "ar" ? "📁 اختر ملف PDF أو صورة" : "📁 Choose PDF or image file"}
          </button>
          {fileName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">{fileName}</p>
          )}
        </div>

        {stage !== "idle" && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700 dark:text-gray-200">{stageLabels[stage]}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  stage === "error" ? "bg-red-500" : stage === "done" ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {stage === "error" && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4 text-sm">
            {errorMsg}
          </div>
        )}

        {stage === "done" && downloadUrl && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <p className="text-green-700 dark:text-green-300 text-sm mb-3">
              {locale === "ar" ? "تم إنشاء المستند بنجاح" : "Document created successfully"}
            </p>
            <a
              href={downloadUrl}
              download={fileName ? fileName.replace(/\.\w+$/, ".docx") : "document.docx"}
              className="inline-block px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {locale === "ar" ? "⬇ تنزيل ملف Word" : "⬇ Download Word file"}
            </a>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center space-y-1">
          <p>{locale === "ar" ? "PDF → استخراج نص → OCR للمسوح → توليد docx" : "PDF → text extraction → OCR for scans → docx generation"}</p>
          <p>{locale === "ar" ? "المعالجة تتم بالكامل في المتصفح — لا ملفات تُرفع للخادم" : "All processing happens in the browser — no files sent to server"}</p>
        </div>
      </div>
    </ToolCalculatorShell>
  );
}
