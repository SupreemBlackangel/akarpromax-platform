"use client";

type Metric = {
  label: string;
  value: string;
  primary?: boolean;
  warning?: string;
};

type ToolResultCardProps = {
  metrics: Metric[];
  note?: string;
};

export function ToolResultCard({ metrics, note }: ToolResultCardProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4" aria-live="polite" aria-atomic="true">
      <div className={`grid gap-3 ${metrics.length <= 3 ? "grid-cols-3" : metrics.length <= 5 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
        {metrics.map((m, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">{m.label}</div>
            <div className={`${m.primary ? "text-xl" : "text-lg"} font-bold text-gray-900 dark:text-white font-mono`}>
              {m.value}
            </div>
            {m.warning && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">{m.warning}</div>
            )}
          </div>
        ))}
      </div>
      {note && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">{note}</p>
      )}
    </div>
  );
}
