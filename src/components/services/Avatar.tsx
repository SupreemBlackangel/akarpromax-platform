"use client";

import { useState } from "react";

const palette = [
  "bg-[var(--color-primary)]", "bg-[var(--color-success)]", "bg-[var(--accent-soft)]0", "bg-rose-500",
  "bg-indigo-600", "bg-teal-600", "bg-orange-500", "bg-violet-600",
];

export default function Avatar({
  name,
  src,
  size = "md",
  index = 0,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  index?: number;
}) {
  const [failed, setFailed] = useState(false);
  const letter = (name.trim().charAt(0) || "?").toUpperCase();
  const sizeClasses = size === "lg" ? "h-16 w-16 text-2xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-11 w-11 text-base";
  const bg = palette[Math.abs(index) % palette.length];
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- dynamic remote avatar URLs (no next/image remote config)
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${sizeClasses} flex-none rounded-full bg-[var(--color-surface)] dark:bg-gray-800 object-cover border border-gray-200 dark:border-gray-700`}
      />
    );
  }
  return (
    <span className={`${sizeClasses} flex-none rounded-full ${bg} grid place-items-center font-bold text-white select-none`}>
      {letter}
    </span>
  );
}
