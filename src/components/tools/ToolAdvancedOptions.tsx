"use client";

import { useState } from "react";

type ToolAdvancedOptionsProps = {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function ToolAdvancedOptions({ label, children, defaultOpen = false }: ToolAdvancedOptionsProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        aria-expanded={open}
      >
        <span>{label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
