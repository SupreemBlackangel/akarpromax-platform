"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  accept?: string[];
  maxFiles?: number;
  maxSizeMB?: number;
  multiple?: boolean;
  locale?: string;
  onFiles: (files: File[]) => void;
  label?: string;
};

export function ToolFileDropzone({
  accept = [".txt", ".csv", ".dxf", ".dwg", ".dat", ".xyz", ".pdf", ".png", ".jpg"],
  maxFiles = 1,
  maxSizeMB = 50,
  multiple = false,
  locale = "ar",
  onFiles,
  label,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = (ar: string, en: string) => (locale === "ar" ? ar : en);

  const validate = useCallback(
    (files: FileList | File[]): File[] => {
      const list = Array.from(files);
      const accepted: File[] = [];
      const maxBytes = maxSizeMB * 1024 * 1024;
      for (const file of list) {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (accept.length && !accept.some((a) => a.toLowerCase() === ext || a.toLowerCase().startsWith(ext))) {
          setError(t(`نوع الملف غير مدعوم: ${file.name}`, `Unsupported file type: ${file.name}`));
          continue;
        }
        if (file.size > maxBytes) {
          setError(t(`حجم الملف يتجاوز ${maxSizeMB}MB`, `File exceeds ${maxSizeMB}MB`));
          continue;
        }
        accepted.push(file);
      }
      return accepted.slice(0, maxFiles);
    },
    [accept, maxFiles, maxSizeMB, t],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = validate(e.dataTransfer.files);
      if (files.length) {
        setError(null);
        onFiles(files);
      }
    },
    [validate, onFiles],
  );

  const handlePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = validate(e.target.files ?? []);
      if (files.length) {
        setError(null);
        onFiles(files);
      }
      e.target.value = "";
    },
    [validate, onFiles],
  );

  return (
    <div
      className={`tc-dropzone${dragOver ? " tc-dropzone--over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label={t("رفع ملف أو سحب وإفلات", "Upload or drag & drop a file")}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
    >
      <input
        ref={inputRef}
        type="file"
        className="tc-dropzone-input"
        accept={accept.join(",")}
        multiple={multiple}
        onChange={handlePick}
        tabIndex={-1}
      />
      <span className="tc-dropzone-icon" aria-hidden="true">⬆</span>
      <span className="tc-dropzone-text">
        {label ?? t("اسحب الملف هنا أو اضغط للاختيار", "Drag a file here or click to browse")}
      </span>
      <span className="tc-dropzone-hint">
        {accept.join(", ")} — {t(`حتى ${maxSizeMB}MB`, `up to ${maxSizeMB}MB`)}
      </span>
      {error && <span className="tc-dropzone-error">{error}</span>}
    </div>
  );
}
