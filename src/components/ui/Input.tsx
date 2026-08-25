"use client";

import { ReactNode, forwardRef } from "react";
import { cn } from "@/src/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, icon, iconPosition = "left", className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-gray-700">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <span
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-gray-400",
                iconPosition === "left" ? "right-3" : "left-3"
              )}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full rounded-lg border bg-[var(--color-surface)] px-4 py-2.5 text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50",
              icon ? (iconPosition === "left" ? "pr-10" : "pl-10") : "",
              error
                ? "border-[var(--color-error)] focus:ring-red-500"
                : "border-gray-300 focus:border-[var(--color-primary)]",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {helper && !error && <p className="text-sm text-gray-500">{helper}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
