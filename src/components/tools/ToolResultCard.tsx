"use client";

type Metric = {
  label: string;
  value: string;
  primary?: boolean;
};

type ToolResultCardProps = {
  metrics: Metric[];
};

export function ToolResultCard({ metrics }: ToolResultCardProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4" aria-live="polite">
      <div className={`grid gap-3 ${metrics.length <= 3 ? "grid-cols-3" : metrics.length <= 5 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
        {metrics.map((m, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">{m.label}</div>
            <div className={`${m.primary ? "text-xl" : "text-lg"} font-bold text-gray-900 dark:text-white font-mono`}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
