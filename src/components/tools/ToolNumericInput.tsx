"use client";

import { useRef, useState } from "react";

const SPIN_CLASS = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const BASE_CLASS = `w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono min-h-[44px] ${SPIN_CLASS}`;
const ERROR_CLASS = "border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800";

type ToolNumericInputProps = {
  value: number;
  onChange: (v: number) => void;
  label: string;
  unit?: string;
  step?: string;
  min?: number;
  max?: number;
  error?: string;
  inputMode?: "decimal" | "numeric";
  className?: string;
};

export function ToolNumericInput({
  value, onChange, label, unit, step, min, max, error, inputMode = "decimal", className,
}: ToolNumericInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | undefined>(error);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form = ref.current?.form;
      if (!form) return;
      const inputs = Array.from(form.querySelectorAll<HTMLInputElement>("input[type='number']"));
      const idx = inputs.indexOf(ref.current!);
      if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw === "-") { onChange(0); setLocalError(undefined); return; }
    const v = parseFloat(raw);
    if (isNaN(v)) return;
    if (min !== undefined && v < min) setLocalError(`Min: ${min}`);
    else if (max !== undefined && v > max) setLocalError(`Max: ${max}`);
    else setLocalError(undefined);
    onChange(v);
  };

  const showError = localError || error;
  const describedBy = showError ? `${label.replace(/\s+/g, "-")}-error` : undefined;

  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
        {label}
        {unit && <span className="text-gray-400 dark:text-gray-500 ml-1">({unit})</span>}
      </label>
      <input
        ref={ref}
        type="number"
        inputMode={inputMode}
        value={value || ""}
        min={min}
        max={max}
        step={step}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-invalid={!!showError}
        aria-describedby={describedBy}
        className={`${BASE_CLASS}${showError ? ` ${ERROR_CLASS}` : ""}${className ? ` ${className}` : ""}`}
      />
      {showError && (
        <p id={describedBy} className="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">
          {showError}
        </p>
      )}
    </div>
  );
}
