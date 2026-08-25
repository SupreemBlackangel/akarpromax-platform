"use client";

import { useRef } from "react";

const SPIN_CLASS = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const BASE_CLASS = `w-full px-3 py-2 text-sm bg-[var(--color-surface)] dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono ${SPIN_CLASS}`;

type NumInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  value: number;
  onChange: (v: number) => void;
  label: string;
};

export function NumInput({ value, onChange, label, className, ...rest }: NumInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form = ref.current?.form;
      if (!form) return;
      const inputs = Array.from(form.querySelectorAll<HTMLInputElement>("input[type='number']"));
      const idx = inputs.indexOf(ref.current!);
      if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
    }
    // Tab uses browser default — no override needed
  };

  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input
        ref={ref}
        type="number"
        value={value || ""}
        onChange={(e) => { const v = parseFloat(e.target.value); onChange(isNaN(v) ? 0 : v); }}
        onKeyDown={handleKeyDown}
        className={`${BASE_CLASS}${className ? ` ${className}` : ""}`}
        {...rest}
      />
    </div>
  );
}
