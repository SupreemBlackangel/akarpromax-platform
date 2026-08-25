"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  MapPin,
  RotateCcw,
  Undo2,
  Redo2,
  Sparkles,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Locale } from "@/src/types/site";
import {
  type SourcePoint,
  type ManualDraft,
  type GeometryStatus,
  type ValidationResult,
  type SuggestedOrder,
  type ConfirmedManualGeometry,
  type ExclusionReason,
  movePoint,
  toggleExclude,
  restoreOriginalOrder,
  getPreviewPoints,
  computePolygonArea,
  computePerimeter,
  detectSelfIntersections,
  validateManualGeometry,
  deriveGeometryStatus,
  suggestSafeOrders,
} from "./useManualGeometry";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type Props = {
  locale: Locale;
  sourcePoints: SourcePoint[];
  draft: ManualDraft;
  onDraftChange: (draft: ManualDraft) => void;
  previewPoints: { lat: number; lon: number }[];
  validation: ValidationResult[];
  status: GeometryStatus;
  areaSqm: number | null;
  perimeterMeters: number | null;
  declaredAreaSqm: number | null;
  hasCrs: boolean;
  hasExplicitTopology: boolean;
  confirmed: ConfirmedManualGeometry | null;
  onConfirm: (geometry: ConfirmedManualGeometry) => void;
  highlightedPointId: string | null;
  onHighlightPoint: (id: string | null) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

/* ------------------------------------------------------------------ */
/*  Copy helpers                                                       */
/* ------------------------------------------------------------------ */

function t3(locale: Locale, ar: string, en: string, tr: string): string {
  if (locale === "ar") return ar;
  if (locale === "tr") return tr;
  return en;
}

function statusColor(status: GeometryStatus): "green" | "yellow" | "red" {
  if (status === "VALID") return "green";
  if (status === "SELF_INTERSECTION" || status === "INSUFFICIENT_POINTS") return "red";
  return "yellow";
}

function statusMessage(locale: Locale, status: GeometryStatus, excluded: number, total: number): string {
  if (status === "VALID") return t3(locale, "الترتيب الحالي صالح للرسم", "The current order is valid for drawing", "Mevcut sıralama çizim için geçerli");
  if (status === "INSUFFICIENT_POINTS") return t3(locale, "يجب اختيار ثلاث نقاط على الأقل", "At least three points must be selected", "En az üç nokta seçilmelidir");
  if (status === "SELF_INTERSECTION") return t3(locale, "يوجد تقاطع بين حدود الأرض. غيّر ترتيب النقاط.", "The boundary self-intersects. Reorder the points.", "Sınır kendi kendine kesişiyor. Noktaları yeniden sıralayın.");
  if (status === "DUPLICATE_DETECTED") return t3(locale, "يوجد نقاط مكررة. تحقق من الترتيب.", "Duplicate points detected. Check the order.", "Tekrarlanan noktalar tespit edildi. Sıralamayı kontrol edin.");
  if (excluded > 0) return t3(locale, `تم استبعاد ${excluded} نقطة من الرسم اليدوي.`, `${excluded} point(s) excluded from manual drawing.`, `${excluded} nokta elle çizimden çıkarıldı.`);
  return t3(locale, "يمكن رسم الحدود، لكن الترتيب لم يتم إثباته من المستند.", "The boundary can be drawn, but the order is not proven by the document.", "Sınır çizilebilir ancak sıra belge ile kanıtlanmamış.");
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ManualGeometryPanel({
  locale,
  sourcePoints,
  draft,
  onDraftChange,
  previewPoints,
  validation,
  status,
  areaSqm,
  perimeterMeters,
  declaredAreaSqm,
  hasCrs,
  hasExplicitTopology,
  confirmed,
  onConfirm,
  highlightedPointId,
  onHighlightPoint,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const ptsById = useMemo(
    () => new Map(sourcePoints.map((sp) => [sp.id, sp])),
    [sourcePoints],
  );

  const includedCount = draft.orderedIds.filter((id) => !draft.excludedIds.has(id)).length;
  const excludedCount = draft.excludedIds.size;
  const totalAreaDiff = declaredAreaSqm != null && areaSqm != null
    ? Math.abs(declaredAreaSqm - areaSqm)
    : null;
  const totalAreaDiffPercent = declaredAreaSqm != null && totalAreaDiff != null && declaredAreaSqm > 0
    ? (totalAreaDiff / declaredAreaSqm) * 100
    : null;

  const suggestions = useMemo(
    () => suggestSafeOrders(sourcePoints, hasCrs),
    [sourcePoints, hasCrs],
  );

  const selfIx = useMemo(
    () => (previewPoints.length >= 3 ? detectSelfIntersections(previewPoints) : []),
    [previewPoints],
  );

  const handleMove = useCallback((id: string, dir: "up" | "down") => {
    onDraftChange(movePoint(draft, id, dir));
  }, [draft, onDraftChange]);

  const handleToggle = useCallback((id: string) => {
    onDraftChange(toggleExclude(draft, id));
  }, [draft, onDraftChange]);

  const handleRestore = useCallback(() => {
    onDraftChange(restoreOriginalOrder(sourcePoints));
  }, [sourcePoints, onDraftChange]);

  const handleApplySuggestion = useCallback((order: string[]) => {
    onDraftChange({
      ...draft,
      orderedIds: order,
      excludedIds: new Set<string>(),
      exclusionReasons: new Map<string, ExclusionReason>(),
    });
  }, [draft, onDraftChange]);

  const handleConfirm = useCallback(() => {
    if (status === "SELF_INTERSECTION" || status === "INSUFFICIENT_POINTS") return;
    onConfirm({
      geometrySource: excludedCount > 0 ? "MANUAL_POINT_SELECTION" : "MANUAL_POINT_ORDER",
      pointOrder: draft.orderedIds.filter((id) => !draft.excludedIds.has(id)),
      selectedIds: draft.orderedIds.filter((id) => !draft.excludedIds.has(id)),
      excludedIds: [...draft.excludedIds],
      exclusionReasons: Object.fromEntries(draft.exclusionReasons),
      confirmedAt: Date.now(),
      validationState: status,
      areaSqm,
      perimeterMeters,
    });
  }, [draft, excludedCount, status, areaSqm, perimeterMeters, onConfirm]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDraggingId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    const srcIdx = draft.orderedIds.indexOf(sourceId);
    const tgtIdx = draft.orderedIds.indexOf(targetId);
    if (srcIdx < 0 || tgtIdx < 0) { setDraggingId(null); setDragOverId(null); return; }
    const next = [...draft.orderedIds];
    next.splice(srcIdx, 1);
    next.splice(tgtIdx, 0, sourceId);
    onDraftChange({ ...draft, orderedIds: next });
    setDraggingId(null);
    setDragOverId(null);
  }, [draft, onDraftChange]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverId(null);
  }, []);

  const color = statusColor(status);
  const message = statusMessage(locale, status, excludedCount, sourcePoints.length);

  return (
    <section className="fml-manual-geom" data-geometry-recovery>
      <div className="fml-manual-geom-head">
        <MapPin size={19} />
        <div>
          <h3>{t3(locale, "ترتيب نقاط حدود الأرض", "Parcel Boundary Point Ordering", "Parsel Sınır Noktası Sıralaması")}</h3>
          <p>
            {hasExplicitTopology
              ? t3(locale,
                  "تم العثور على ترتيب نقاط مستخرج من المستند.",
                  "An extracted point order was found in the document.",
                  "Belgeden çıkarılmış bir nokta sırası bulundu.")
              : t3(locale,
                  "تم العثور على الإحداثيات، لكن ترتيب الحدود يحتاج إلى مراجعة قبل رسم الأرض.",
                  "Coordinates were found, but the boundary ordering needs review before drawing the parcel.",
                  "Koordinatlar bulundu ancak sınır sıralaması çizimden önce gözden geçirilmeli.")}
          </p>
        </div>
      </div>

      {/* --- Toolbar --- */}
      <div className="fml-mg-toolbar">
        <div className="fml-mg-toolbar-group">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="fml-mg-btn"
            aria-label={t3(locale, "تراجع", "Undo", "Geri al")}
            title={t3(locale, "تراجع", "Undo", "Geri al")}
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="fml-mg-btn"
            aria-label={t3(locale, "إعادة", "Redo", "İleri al")}
            title={t3(locale, "إعادة", "Redo", "İleri al")}
          >
            <Redo2 size={15} />
          </button>
          <button type="button" onClick={handleRestore} className="fml-mg-btn" title={t3(locale, "إعادة الترتيب الأصلي", "Restore source order", "Orijinal sırayı geri yükle")}>
            <RotateCcw size={15} />
            <span>{t3(locale, "الأصلي", "Original", "Orijinal")}</span>
          </button>
        </div>
        <span className="fml-mg-count">
          {includedCount}/{sourcePoints.length} {t3(locale, "نقاط مستخدمة", "used", "kullanıldı")}
          {excludedCount > 0 && <span className="fml-mg-excluded-badge"> · {excludedCount} {t3(locale, "مستبعد", "excluded", "çıkartıldı")}</span>}
        </span>
      </div>

      {/* --- Status bar --- */}
      <div className={`fml-mg-status fml-mg-status--${color}`} role="status">
        <span className="fml-mg-status-dot" />
        <span>{message}</span>
      </div>

      {/* --- Point list --- */}
      <div className="fml-mg-list" ref={listRef} role="listbox" aria-label={t3(locale, "نقاط الحدود", "Boundary points", "Sınır noktaları")}>
        {draft.orderedIds.map((id, displayOrder) => {
          const sp = ptsById.get(id);
          if (!sp) return null;
          const excluded = draft.excludedIds.has(id);
          const isHighlighted = highlightedPointId === id;
          const isDragging = draggingId === id;
          const isDragTarget = dragOverId === id;
          const isExpanded = expandedPoint === id;

          return (
            <div
              key={id}
              role="option"
              aria-selected={isHighlighted}
              aria-label={`${sp.label} — ${sp.latText}, ${sp.lonText}`}
              className={`fml-mg-point ${excluded ? "fml-mg-point--excluded" : ""} ${isHighlighted ? "fml-mg-point--highlighted" : ""} ${isDragging ? "fml-mg-point--dragging" : ""} ${isDragTarget ? "fml-mg-point--drag-target" : ""}`}
              draggable={!excluded}
              onDragStart={(e) => handleDragStart(e, id)}
              onDragOver={(e) => handleDragOver(e, id)}
              onDrop={(e) => handleDrop(e, id)}
              onDragEnd={handleDragEnd}
              onClick={() => onHighlightPoint(isHighlighted ? null : id)}
            >
              <div className="fml-mg-point-grip" aria-hidden="true">
                {!excluded && <GripVertical size={14} />}
              </div>
              <span className={`fml-mg-point-num ${excluded ? "fml-mg-point-num--excluded" : ""}`}>
                {excluded ? "—" : displayOrder + 1}
              </span>
              <div className="fml-mg-point-info">
                <span className="fml-mg-point-label">
                  {sp.label}
                  {sp.confidence != null && (
                    <span className="fml-mg-point-conf">{Math.round(sp.confidence * 100)}%</span>
                  )}
                </span>
                <span className="fml-mg-point-coords" dir="ltr">
                  E: {sp.lonText} · N: {sp.latText}
                </span>
              </div>
              <div className="fml-mg-point-actions">
                <button
                  type="button"
                  className="fml-mg-btn fml-mg-btn--sm"
                  onClick={(e) => { e.stopPropagation(); handleToggle(id); }}
                  aria-label={excluded ? t3(locale, "إعادة للنقاط", "Re-include point", "Noktayı geri ekle") : t3(locale, "استبعاد", "Exclude", "Dışarıda bırak")}
                  title={excluded ? t3(locale, "إعادة للنقاط", "Re-include point", "Noktayı geri ekle") : t3(locale, "استبعاد من الرسم", "Exclude from drawing", "Çizimden çıkar")}
                >
                  {excluded ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                {!excluded && (
                  <>
                    <button
                      type="button"
                      className="fml-mg-btn fml-mg-btn--sm"
                      onClick={(e) => { e.stopPropagation(); handleMove(id, "up"); }}
                      disabled={displayOrder === 0}
                      aria-label={t3(locale, `تحريك ${sp.label} للأعلى`, `Move ${sp.label} up`, `${sp.label} yukarı taşı`)}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="fml-mg-btn fml-mg-btn--sm"
                      onClick={(e) => { e.stopPropagation(); handleMove(id, "down"); }}
                      disabled={displayOrder === draft.orderedIds.length - 1}
                      aria-label={t3(locale, `تحريك ${sp.label} للأسفل`, `Move ${sp.label} down`, `${sp.label} aşağı taşı`)}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="fml-mg-btn fml-mg-btn--sm"
                  onClick={(e) => { e.stopPropagation(); setExpandedPoint(isExpanded ? null : id); }}
                  aria-label={t3(locale, "تفاصيل", "Details", "Ayrıntılar")}
                >
                  <span className={`fml-mg-expand-arrow ${isExpanded ? "is-open" : ""}`}>›</span>
                </button>
              </div>
              {isExpanded && (
                <div className="fml-mg-point-details">
                  <dl>
                    <dt>{t3(locale, "النص المصدر", "Source text", "Kaynak metin")}</dt>
                    <dd>{sp.raw}</dd>
                    {sp.page != null && <><dt>{t3(locale, "الصفحة", "Page", "Sayfa")}</dt><dd>{sp.page}</dd></>}
                    {sp.rowIndex != null && <><dt>{t3(locale, "الصف", "Row", "Satır")}</dt><dd>{sp.rowIndex}</dd></>}
                    <dt>CRS</dt><dd>{sp.crsHint}</dd>
                  </dl>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- Self-intersection warning --- */}
      {selfIx.length > 0 && (
        <div className="fml-mg-alert fml-mg-alert--red">
          <AlertTriangle size={15} />
          <span>{t3(locale, "يوجد تقاطع بين حدود الأرض.", "The boundary self-intersects.", "Sınır kendi kendine kesişiyor.")} {selfIx.map((p) => `${p.a + 1}↔${p.b + 1}`).join(", ")}</span>
        </div>
      )}

      {/* --- Area comparison --- */}
      {(areaSqm != null || declaredAreaSqm != null) && (
        <div className="fml-mg-area">
          {declaredAreaSqm != null && (
            <div className="fml-mg-area-row">
              <span>{t3(locale, "المساحة المسجلة", "Registered area", "Kayıtlı alan")}</span>
              <strong>{declaredAreaSqm.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 2 })} م²</strong>
            </div>
          )}
          {areaSqm != null && (
            <div className="fml-mg-area-row">
              <span>{t3(locale, "المساحة الناتجة من الترتيب الحالي", "Area from current order", "Mevcut sıralamadan alan")}</span>
              <strong>{areaSqm.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 2 })} م²</strong>
            </div>
          )}
          {totalAreaDiff != null && totalAreaDiffPercent != null && (
            <div className="fml-mg-area-row fml-mg-area-row--diff">
              <span>{t3(locale, "الفرق", "Difference", "Fark")}</span>
              <strong>
                {totalAreaDiff.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 2 })} م²
                {" "}({totalAreaDiffPercent.toFixed(1)}%)
              </strong>
            </div>
          )}
          {perimeterMeters != null && (
            <div className="fml-mg-area-row">
              <span>{t3(locale, "المحيط", "Perimeter", "Çevre")}</span>
              <strong>{perimeterMeters.toFixed(2)} m</strong>
            </div>
          )}
        </div>
      )}

      {/* --- Validation checklist --- */}
      <details className="fml-mg-validations">
        <summary>{t3(locale, "فحوصات الترتيب", "Ordering validations", "Sıralama doğrulamaları")} ({validation.filter((v) => v.status === "PASS").length}/{validation.length})</summary>
        <div className="fml-mg-validation-list">
          {validation.map((v) => (
            <div key={v.code} className={`fml-mg-validation fml-mg-validation--${v.status.toLowerCase()}`}>
              <span className="fml-mg-validation-icon">
                {v.status === "PASS" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              </span>
              <span className="fml-mg-validation-code">{v.code}</span>
              {v.detail && <span className="fml-mg-validation-detail">{v.detail}</span>}
            </div>
          ))}
        </div>
      </details>

      {/* --- Suggestions --- */}
      {suggestions.length > 0 && (
        <div className="fml-mg-suggestions">
          <button type="button" className="fml-mg-btn" onClick={() => setShowSuggestions(!showSuggestions)}>
            <Sparkles size={14} />
            {t3(locale, "اقتراح ترتيب للنقاط", "Suggest point ordering", "Nokta sıralaması öner")}
            <span className={`fml-mg-expand-arrow ${showSuggestions ? "is-open" : ""}`}>›</span>
          </button>
          {showSuggestions && (
            <div className="fml-mg-suggestion-list">
              {suggestions.map((s, i) => (
                <div key={i} className="fml-mg-suggestion">
                  <div className="fml-mg-suggestion-head">
                    <strong>{t3(locale, "ترتيب مقترح", "Suggested order", "Önerilen sıra")} {i + 1}</strong>
                    <span className="fml-mg-suggestion-method">{s.method}</span>
                    <span className="fml-mg-suggestion-area">
                      {s.areaSqm != null ? `${s.areaSqm.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 2 })} م²` : "—"}
                    </span>
                  </div>
                  <p className="fml-mg-suggestion-reason">{s.reason}</p>
                  <div className="fml-mg-suggestion-order">
                    {s.order.map((id) => ptsById.get(id)?.label ?? id).join(" → ")}
                  </div>
                  <button
                    type="button"
                    className="fml-primary-btn fml-mg-btn--apply"
                    onClick={() => handleApplySuggestion(s.order)}
                  >
                    <CheckCircle2 size={14} />
                    {t3(locale, "استخدام هذا الترتيب", "Use this order", "Bu sırayı kullan")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- Confirmation --- */}
      <div className="fml-mg-confirm">
        <p className="fml-mg-confirm-hint">
          {t3(locale,
            "سيتم استخدام الترتيب الذي اخترته لرسم حدود الأرض. الإحداثيات الأصلية لن يتم تغييرها.",
            "The order you choose will be used to draw the parcel boundary. Original coordinates will not be changed.",
            "Seçtiğiniz sıra parsel sınırını çizmek için kullanılacaktır. Orijinal koordinatlar değiştirilmeyecektir.")}
        </p>
        <button
          type="button"
          className="fml-primary-btn fml-mg-confirm-btn"
          disabled={status === "SELF_INTERSECTION" || status === "INSUFFICIENT_POINTS"}
          onClick={handleConfirm}
        >
          <CheckCircle2 size={16} />
          {t3(locale, "اعتماد ترتيب النقاط ورسم الأرض", "Confirm point order and draw parcel", "Nokta sırasını onayla ve parseli çiz")}
        </button>
        {confirmed && (
          <p className="fml-mg-confirmed">
            <CheckCircle2 size={14} />
            {t3(locale, "تم رسم الأرض حسب ترتيب النقاط الذي قمت بمراجعته.", "The parcel was drawn using the order you reviewed.", "Parsel, incelediğiniz sıralamaya göre çizildi.")}
          </p>
        )}
      </div>
    </section>
  );
}
