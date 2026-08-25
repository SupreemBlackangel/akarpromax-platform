"use client";

import { useState } from "react";

const SPIN_CLASS = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const BASE_CLASS = `w-full px-3 py-2 text-[16px] sm:text-sm bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono min-h-[48px] md:min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] dark:focus:ring-blue-400 focus:border-transparent ${SPIN_CLASS}`;
const ERROR_CLASS = "border-red-400 dark:border-[var(--color-error)] focus:ring-red-200 dark:focus:ring-red-800";

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
  const [localError, setLocalError] = useState<string | undefined>(error);

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
  const errorId = `${label.replace(/\s+/g, "-")}-error`;
  const describedBy = showError ? errorId : undefined;

  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
        {label}
        {unit && <span className="text-gray-400 dark:text-gray-500 ml-1">({unit})</span>}
      </label>
      <input
        type="number"
        inputMode={inputMode}
        value={value || ""}
        min={min}
        max={max}
        step={step}
        onChange={handleChange}
        aria-invalid={!!showError}
        aria-describedby={describedBy}
        className={`${BASE_CLASS}${showError ? ` ${ERROR_CLASS}` : ""}${className ? ` ${className}` : ""}`}
      />
      {showError && (
        <p id={errorId} className="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">
          {showError}
        </p>
      )}
    </div>
  );
}
