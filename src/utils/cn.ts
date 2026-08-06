export type ClassValue = string | number | null | undefined | false | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const parts: string[] = [];
  for (const value of values) {
    if (!value && value !== 0) continue;
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) parts.push(nested);
      continue;
    }
    parts.push(String(value).trim());
  }
  return parts.join(" ");
}
