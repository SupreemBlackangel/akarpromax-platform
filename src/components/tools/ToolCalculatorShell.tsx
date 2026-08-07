"use client";

type ToolCalculatorShellProps = {
  title: string;
  subtitle?: string;
  dir?: "rtl" | "ltr";
  children: React.ReactNode;
};

export function ToolCalculatorShell({ title, subtitle, dir, children }: ToolCalculatorShellProps) {
  return (
    <div dir={dir}>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{title}</h2>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
