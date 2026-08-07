"use client";

type ToolSelectInputProps = {
  label: string;
  value: number | string;
  onChange: (v: number | string) => void;
  options: { value: number | string; label: string }[];
  className?: string;
};

export function ToolSelectInput({ label, value, onChange, options, className }: ToolSelectInputProps) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => {
          const num = Number(e.target.value);
          onChange(isNaN(num) ? e.target.value : num);
        }}
        className="w-full px-3 py-2 text-[16px] sm:text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-mono min-h-[48px] md:min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
