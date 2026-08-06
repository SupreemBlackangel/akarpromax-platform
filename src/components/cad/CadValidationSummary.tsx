"use client";

import type { CadValidationIssue } from "@/src/lib/cad/types";

type Props = {
  issues: CadValidationIssue[];
  locale?: string;
};

export function CadValidationSummary({ issues, locale = "ar" }: Props) {
  if (issues.length === 0) {
    return (
      <div className="cad-validation cad-validation--ok">
        <span aria-hidden="true">✓</span>
        {locale === "ar" ? "البيانات الهندسية سليمة" : "Drawing data is valid"}
      </div>
    );
  }
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.length - errors;
  return (
    <div className={`cad-validation${errors > 0 ? " cad-validation--error" : " cad-validation--warn"}`}>
      <strong>
        {locale === "ar" ? `${errors} أخطاء و ${warnings} تحذيرات` : `${errors} errors, ${warnings} warnings`}
      </strong>
      <ul className="cad-validation-list">
        {issues.slice(0, 8).map((issue, i) => (
          <li key={i} data-level={issue.level}>
            {issue.level === "error" ? "✕ " : "⚠ "}
            {issue.message}
          </li>
        ))}
        {issues.length > 8 && (
          <li>… {locale === "ar" ? `${issues.length - 8} إضافية` : `${issues.length - 8} more`}</li>
        )}
      </ul>
    </div>
  );
}
