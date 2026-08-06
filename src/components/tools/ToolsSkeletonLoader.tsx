"use client";

export function ToolsSkeletonLoader() {
  return (
    <div className="tc-grid" aria-busy="true" aria-label="Loading tools">
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="tc-skeleton-card" key={i}>
          <div className="tc-skeleton-row">
            <div className="tc-skeleton-icon" />
            <div className="tc-skeleton-badge" />
          </div>
          <div className="tc-skeleton-title" />
          <div className="tc-skeleton-text" />
          <div className="tc-skeleton-text tc-skeleton-text--short" />
          <div className="tc-skeleton-footer" />
        </div>
      ))}
    </div>
  );
}
