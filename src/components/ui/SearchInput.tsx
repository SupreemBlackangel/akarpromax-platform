import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "@/src/utils/cn";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
};

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { label, error, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {label && (
        <label htmlFor={inputId} className="text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)]">
          {label}
        </label>
      )}
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute start-[var(--space-3)] top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-text-muted)]"
        />
        <input
          ref={ref}
          id={inputId}
          type="search"
          className={cn(
            "h-10 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-input)] ps-[var(--space-10)] pe-[var(--space-4)] text-[var(--font-size-md)] text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--motion-fast)] focus:outline-none focus:shadow-[var(--shadow-focus)] focus:border-[color:var(--color-border-focus)] disabled:bg-[color:var(--color-disabled-surface)] disabled:text-[color:var(--color-disabled)]",
            error && "border-[color:var(--color-danger)]",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
      </div>
      {error && (
        <span id={errorId} role="alert" className="text-[var(--font-size-xs)] font-medium text-[color:var(--color-danger)]">
          {error}
        </span>
      )}
    </div>
  );
});

export default SearchInput;
