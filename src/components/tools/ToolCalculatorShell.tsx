"use client";

import { useRef } from "react";

type ToolCalculatorShellProps = {
  title: string;
  subtitle?: string;
  dir?: "rtl" | "ltr";
  children: React.ReactNode;
};

export function ToolCalculatorShell({ title, subtitle, dir, children }: ToolCalculatorShellProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    // Exclude textareas so Enter still inserts newlines (e.g. polygon coordinates).
    if (target.tagName !== "INPUT" && target.tagName !== "SELECT") return;
    const root = ref.current;
    if (!root) return;
    const controls = Array.from(
      root.querySelectorAll<HTMLElement>("input:not([type='hidden']), select"),
    );
    const idx = controls.indexOf(target);
    if (idx >= 0 && idx < controls.length - 1) {
      e.preventDefault();
      controls[idx + 1].focus();
    }
  };

  return (
    <div dir={dir} ref={ref} onKeyDown={handleKeyDown}>
      <h2 className="tc-calculator-title">{title}</h2>
      {subtitle && (
        <p className="tc-calculator-subtitle">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
