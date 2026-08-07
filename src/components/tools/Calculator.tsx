"use client";

import { useCallback, useState } from "react";
import { ToolCalculatorShell } from "./ToolCalculatorShell";

type CalcProps = { locale: string };

type HistoryEntry = { expr: string; result: string };

const BUTTONS: Array<Array<{ label: string; action: string; wide?: boolean }>> = [
  [
    { label: "MC", action: "mc" },
    { label: "MR", action: "mr" },
    { label: "M+", action: "m+" },
    { label: "M−", action: "m-" },
    { label: "MS", action: "ms" },
  ],
  [
    { label: "C", action: "clear" },
    { label: "⌫", action: "backspace" },
    { label: "%", action: "percent" },
    { label: "÷", action: "op÷" },
    { label: "x²", action: "sqr" },
  ],
  [
    { label: "7", action: "7" },
    { label: "8", action: "8" },
    { label: "9", action: "9" },
    { label: "×", action: "op×" },
    { label: "√", action: "sqrt" },
  ],
  [
    { label: "4", action: "4" },
    { label: "5", action: "5" },
    { label: "6", action: "6" },
    { label: "−", action: "op−" },
    { label: "1/x", action: "inv" },
  ],
  [
    { label: "1", action: "1" },
    { label: "2", action: "2" },
    { label: "3", action: "3" },
    { label: "+", action: "op+" },
    { label: "π", action: "pi" },
  ],
  [
    { label: "±", action: "negate" },
    { label: "0", action: "0" },
    { label: ".", action: "." },
    { label: "=", action: "equals", wide: true },
    { label: "e", action: "euler" },
  ],
];

export function Calculator({ locale }: CalcProps) {
  const [display, setDisplay] = useState("0");
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hasMemory, setHasMemory] = useState(false);
  const [lastOp, setLastOp] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState<number | null>(null);
  const [freshResult, setFreshResult] = useState(false);

  const formatNum = useCallback((n: number): string => {
    if (!isFinite(n)) return "Error";
    const s = n.toPrecision(12);
    return parseFloat(s).toString();
  }, []);

  const calculate = useCallback((a: number, op: string, b: number): number => {
    switch (op) {
      case "÷": return a / b;
      case "×": return a * b;
      case "−": return a - b;
      case "+": return a + b;
      default: return b;
    }
  }, []);

  const handleButton = useCallback((action: string) => {
    if (action === "clear") {
      setDisplay("0");
      setLastOp(null);
      setPendingValue(null);
      setFreshResult(false);
      return;
    }
    if (action === "backspace") {
      setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));
      return;
    }
    if (action === "mc") { setMemory(0); setHasMemory(false); return; }
    if (action === "mr") { setDisplay(formatNum(memory)); setFreshResult(true); return; }
    if (action === "ms") { setMemory(parseFloat(display) || 0); setHasMemory(true); return; }
    if (action === "m+") { setMemory((m) => m + (parseFloat(display) || 0)); setHasMemory(true); return; }
    if (action === "m-") { setMemory((m) => m - (parseFloat(display) || 0)); setHasMemory(true); return; }

    if (action === "sqr") {
      const v = parseFloat(display);
      const r = v * v;
      setHistory((h) => [...h, { expr: `sqr(${display})`, result: formatNum(r) }]);
      setDisplay(formatNum(r));
      setFreshResult(true);
      return;
    }
    if (action === "sqrt") {
      const v = parseFloat(display);
      const r = Math.sqrt(v);
      setHistory((h) => [...h, { expr: `√(${display})`, result: formatNum(r) }]);
      setDisplay(formatNum(r));
      setFreshResult(true);
      return;
    }
    if (action === "inv") {
      const v = parseFloat(display);
      const r = 1 / v;
      setHistory((h) => [...h, { expr: `1/(${display})`, result: formatNum(r) }]);
      setDisplay(formatNum(r));
      setFreshResult(true);
      return;
    }
    if (action === "percent") {
      const v = parseFloat(display);
      const base = pendingValue ?? 1;
      setDisplay(formatNum((base * v) / 100));
      setFreshResult(true);
      return;
    }
    if (action === "negate") {
      setDisplay((d) => d.startsWith("-") ? d.slice(1) : d === "0" ? d : "-" + d);
      return;
    }
    if (action === "pi") { setDisplay(formatNum(Math.PI)); setFreshResult(true); return; }
    if (action === "euler") { setDisplay(formatNum(Math.E)); setFreshResult(true); return; }

    if (action === "equals") {
      if (lastOp && pendingValue !== null) {
        const current = parseFloat(display);
        const r = calculate(pendingValue, lastOp, current);
        const expr = `${formatNum(pendingValue)} ${lastOp} ${display}`;
        setHistory((h) => [...h, { expr, result: formatNum(r) }]);
        setDisplay(formatNum(r));
        setLastOp(null);
        setPendingValue(null);
        setFreshResult(true);
      }
      return;
    }

    if (action.startsWith("op")) {
      const op = action.slice(2);
      const current = parseFloat(display);
      if (pendingValue !== null && lastOp && !freshResult) {
        const r = calculate(pendingValue, lastOp, current);
        setDisplay(formatNum(r));
        setPendingValue(r);
      } else {
        setPendingValue(current);
      }
      setLastOp(op);
      setFreshResult(false);
      return;
    }

    if (action === ".") {
      setDisplay((d) => {
        if (freshResult) return "0.";
        return d.includes(".") ? d : d + ".";
      });
      setFreshResult(false);
      return;
    }

    setDisplay((d) => {
      if (freshResult) return action;
      return d === "0" ? action : d + action;
    });
    setFreshResult(false);
  }, [display, lastOp, pendingValue, freshResult, memory, calculate, formatNum]);

  return (
    <ToolCalculatorShell
      title={locale === "ar" ? "الآلة الحاسبة العلمية" : "Scientific Calculator"}
      dir="rtl"
    >
      <div className="max-w-sm mx-auto">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-3">
          <div className="text-right text-xs text-gray-400 dark:text-gray-500 h-5 truncate">
            {hasMemory ? `M = ${formatNum(memory)}` : ""}
            {lastOp && pendingValue !== null ? ` ${formatNum(pendingValue)} ${lastOp}` : ""}
          </div>
          <div className="text-right text-3xl font-mono font-bold text-gray-900 dark:text-white truncate min-h-[40px] flex items-center justify-end">
            {display}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {BUTTONS.flat().map((btn, i) => (
            <button
              key={i}
              onClick={() => handleButton(btn.action)}
              className={`h-12 min-h-[48px] rounded-lg text-sm font-semibold transition-all active:scale-95 border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                btn.action === "equals"
                  ? "col-span-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-700"
                  : btn.action.startsWith("op") || btn.action === "clear" || btn.action === "backspace"
                    ? "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                    : btn.action.startsWith("m") || btn.action === "mc" || btn.action === "mr" || btn.action === "ms"
                      ? "bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700"
                      : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {history.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {locale === "ar" ? "السجل" : "History"}
              </h3>
              <button
                onClick={() => setHistory([])}
                className="text-xs text-red-500 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
              >
                {locale === "ar" ? "مسح السجل" : "Clear history"}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {history.slice().reverse().map((entry, i) => (
                <div key={i} className="text-xs bg-gray-50 dark:bg-gray-800 rounded px-3 py-1.5 flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 font-mono">{entry.expr}</span>
                  <span className="text-gray-900 dark:text-white font-mono font-semibold">= {entry.result}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolCalculatorShell>
  );
}
