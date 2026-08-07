"use client";

import { useCallback, useState } from "react";

type Action = {
  label: string;
  icon?: string;
  onClick: () => void;
};

type ToolSecondaryActionsProps = {
  actions: Action[];
};

export function ToolSecondaryActions({ actions }: ToolSecondaryActionsProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleClick = useCallback((action: Action, idx: number) => {
    action.onClick();
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }, []);

  return (
    <div className="flex gap-2 flex-wrap">
      {actions.map((action, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => handleClick(action, idx)}
          className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          {copiedIdx === idx ? "✓" : `${action.icon ? action.icon + " " : ""}${action.label}`}
        </button>
      ))}
    </div>
  );
}
