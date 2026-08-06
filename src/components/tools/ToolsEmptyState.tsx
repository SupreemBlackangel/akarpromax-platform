"use client";

type Props = {
  locale: string;
  onClear: () => void;
};

export function ToolsEmptyState({ locale, onClear }: Props) {
  return (
    <div className="tc-empty" role="status">
      <div className="tc-empty-icon" aria-hidden="true">🔍</div>
      <p className="tc-empty-title">
        {locale === "ar"
          ? "لا توجد نتائج"
          : locale === "tr"
            ? "Sonuç bulunamadı"
            : "No results found"}
      </p>
      <p className="tc-empty-desc">
        {locale === "ar"
          ? "جرّب تغيير كلمات البحث أو مسح الفلاتر"
          : locale === "tr"
            ? "Arama terimlerinizi değiştirin veya filtreleri temizleyin"
            : "Try changing your search terms or clearing filters"}
      </p>
      <button type="button" className="tc-empty-btn" onClick={onClear}>
        {locale === "ar"
          ? "مسح البحث"
          : locale === "tr"
            ? "Aramayı temizle"
            : "Clear Search"}
      </button>
    </div>
  );
}
