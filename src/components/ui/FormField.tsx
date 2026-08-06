import { cloneElement, isValidElement, useId } from "react";
import FormError from "./FormError";

type Props = {
  label: string;
  id?: string;
  hint?: string;
  error?: string;
  children: React.ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
};

export default function FormField({ label, id, hint, error, children }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: fieldId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className="input-wrapper">
      <label htmlFor={fieldId} className="input-label">
        {label}
      </label>
      {control}
      {hint && (
        <span id={hintId} className="input-hint">
          {hint}
        </span>
      )}
      {error && <FormError id={errorId}>{error}</FormError>}
    </div>
  );
}
