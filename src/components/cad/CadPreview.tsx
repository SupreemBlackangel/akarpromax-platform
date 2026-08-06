"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CadDocumentModel, CadEntity } from "@/src/lib/cad/types";
import { cadToScreenPoint, computeBounds, roundTo, screenToCadPoint, type ViewTransform } from "@/src/lib/cad/coordinates";

type Props = {
  document: CadDocumentModel;
  locale?: string;
  showGrid?: boolean;
  showOrigin?: boolean;
  onLayerToggle?: (layerName: string, visible: boolean) => void;
  onSelectEntity?: (index: number | null) => void;
};

function layerRgb(doc: CadDocumentModel, layerName: string): string {
  const palette = ["", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ffffff", "#808080", "#aaaaaa"];
  const layer = doc.layers.find((l) => l.name === layerName);
  if (!layer) return "#cccccc";
  if (typeof layer.color === "number") return palette[layer.color] ?? "#cccccc";
  return layer.color;
}

export function CadPreview({ document, locale = "ar", showGrid = true, showOrigin = true, onSelectEntity }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<ViewTransform>({ scale: 1, originX: 0, originY: 0 });
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [measure, setMeasure] = useState<string | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; ox: number; oy: number }>({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });
  const selectedRef = useRef<number | null>(null);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);

  const bounds = useMemo(
    () => {
      const pts: { x: number; y: number }[] = [];
      for (const e of document.entities) {
        switch (e.type) {
          case "LINE":
            pts.push(e.start, e.end);
            break;
          case "LWPOLYLINE":
            pts.push(...e.points);
            break;
          case "CIRCLE":
            pts.push({ x: e.center.x - e.radius, y: e.center.y - e.radius }, { x: e.center.x + e.radius, y: e.center.y + e.radius });
            break;
          case "ARC":
            pts.push({ x: e.center.x - e.radius, y: e.center.y - e.radius }, { x: e.center.x + e.radius, y: e.center.y + e.radius });
            break;
          case "POINT":
            pts.push(e.position);
            break;
          case "TEXT":
          case "MTEXT":
            pts.push(e.position);
            break;
          case "HATCH":
            pts.push(...e.boundary);
            break;
          case "DIMENSION":
            pts.push(e.start, e.end);
            break;
        }
      }
      return computeBounds([{ points: pts }], { minX: -10, maxX: 10, minY: -10, maxY: 10 });
    },
    [document],
  );

  const fitToView = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const pad = 50;
    const scale = Math.min((w - pad) / (bounds.maxX - bounds.minX), (h - pad) / (bounds.maxY - bounds.minY));
    const originX = w / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
    const originY = h / 2 + ((bounds.minY + bounds.maxY) / 2) * scale;
    setTransform({ scale: Math.max(scale, 0.01), originX, originY });
  }, [bounds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const resize = () => {
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      draw();
    };
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0b1527";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      if (showGrid) {
        const step = 50;
        const startX = transform.originX % step;
        const startY = transform.originY % step;
        ctx.strokeStyle = "#182c4a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = startX; x < canvas.width; x += step) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
        }
        for (let y = startY; y < canvas.height; y += step) {
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(transform.originX, transform.originY);
      ctx.scale(transform.scale, -transform.scale);

      for (let i = 0; i < document.entities.length; i++) {
        const entity = document.entities[i];
        const layer = document.layers.find((l) => l.name === entity.layer);
        if (layer && layer.visible === false) continue;
        drawEntity(ctx, entity, i);
      }

      ctx.restore();

      if (showOrigin) {
        ctx.strokeStyle = "#d8af55";
        ctx.lineWidth = 1;
        const o = cadToScreenPoint({ x: 0, y: 0 }, transform);
        ctx.beginPath();
        ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [document, transform, showGrid, showOrigin]);

  useEffect(() => {
    const id = requestAnimationFrame(() => fitToView());
    return () => cancelAnimationFrame(id);
  }, [fitToView]);

  function drawEntity(ctx: CanvasRenderingContext2D, entity: CadEntity, index: number) {
    const stroke = layerRgb(document, entity.layer);
    const isSel = selectedRef.current === index;
    ctx.strokeStyle = isSel ? "#d8af55" : stroke;
    ctx.fillStyle = isSel ? "#d8af55" : stroke;
    ctx.lineWidth = isSel ? 1.5 / transform.scale : 1 / transform.scale;

    switch (entity.type) {
      case "LINE":
        ctx.beginPath();
        ctx.moveTo(entity.start.x, entity.start.y);
        ctx.lineTo(entity.end.x, entity.end.y);
        ctx.stroke();
        break;
      case "LWPOLYLINE": {
        if (entity.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(entity.points[0].x, entity.points[0].y);
        for (let i = 1; i < entity.points.length; i++) ctx.lineTo(entity.points[i].x, entity.points[i].y);
        if (entity.closed) ctx.closePath();
        ctx.stroke();
        break;
      }
      case "CIRCLE":
        ctx.beginPath();
        ctx.arc(entity.center.x, entity.center.y, entity.radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "ARC":
        ctx.beginPath();
        ctx.arc(entity.center.x, entity.center.y, entity.radius, (entity.startAngleDeg * Math.PI) / 180, (entity.endAngleDeg * Math.PI) / 180);
        ctx.stroke();
        break;
      case "POINT":
        ctx.beginPath();
        ctx.arc(entity.position.x, entity.position.y, 0.8 / transform.scale, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "TEXT":
      case "MTEXT": {
        ctx.font = `${Math.max(0.5, entity.height)}px sans-serif`;
        ctx.textAlign = entity.alignment === "center" ? "center" : "left";
        ctx.fillText(entity.text, entity.position.x, entity.position.y);
        break;
      }
      case "HATCH": {
        if (entity.boundary.length < 3) break;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.moveTo(entity.boundary[0].x, entity.boundary[0].y);
        for (let i = 1; i < entity.boundary.length; i++) ctx.lineTo(entity.boundary[i].x, entity.boundary[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        break;
      }
      case "DIMENSION": {
        ctx.setLineDash([2 / transform.scale, 1.5 / transform.scale]);
        ctx.beginPath();
        ctx.moveTo(entity.start.x, entity.start.y);
        ctx.lineTo(entity.end.x, entity.end.y);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
    }
  }

  function handleWheel(e: React.WheelEvent) {
    const factor = e.deltaY > 0 ? 0.85 : 1.18;
    setTransform((t) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return t;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const scale = Math.min(50, Math.max(0.01, t.scale * factor));
      const originX = mx - ((mx - t.originX) / t.scale) * scale;
      const originY = my - ((my - t.originY) / t.scale) * scale;
      return { scale, originX, originY };
    });
  }

  function handlePointerDown(e: React.PointerEvent) {
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, ox: transform.originX, oy: transform.originY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setTransform((t) => ({ ...t, originX: dragRef.current.ox + dx, originY: dragRef.current.oy + dy }));
      return;
    }
    const cad = screenToCadPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top }, transform);
    const h = { x: roundTo(cad.x, 2), y: roundTo(cad.y, 2) };
    hoverRef.current = h;
    setHover(h);
    // Hit test entities
    let found: number | null = null;
    for (let i = document.entities.length - 1; i >= 0; i--) {
      const entity = document.entities[i];
      if (hitTest(entity, cad, transform.scale)) {
        found = i;
        break;
      }
    }
    if (found !== selectedRef.current) {
      selectedRef.current = found;
      onSelectEntity?.(found);
      requestAnimationFrame(() => redraw());
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    dragRef.current.active = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }

  function redraw() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#0b1527";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(transform.originX, transform.originY);
    ctx.scale(transform.scale, -transform.scale);
    for (let i = 0; i < document.entities.length; i++) {
      const entity = document.entities[i];
      const layer = document.layers.find((l) => l.name === entity.layer);
      if (layer && layer.visible === false) continue;
      drawEntity(ctx, entity, i);
    }
    ctx.restore();
  }

  function hitTest(entity: CadEntity, p: { x: number; y: number }, scale: number): boolean {
    const tol = 2 / scale;
    switch (entity.type) {
      case "LINE":
        return distToSegment(p, entity.start, entity.end) < tol;
      case "LWPOLYLINE": {
        for (let i = 1; i < entity.points.length; i++) {
          if (distToSegment(p, entity.points[i - 1], entity.points[i]) < tol) return true;
        }
        return false;
      }
      case "CIRCLE":
        return Math.abs(Math.hypot(p.x - entity.center.x, p.y - entity.center.y) - entity.radius) < tol;
      case "POINT":
        return Math.hypot(p.x - entity.position.x, p.y - entity.position.y) < tol;
      default:
        return false;
    }
  }

  function distToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  const zoomLevel = roundTo(transform.scale, 3);

  return (
    <div className="cad-preview">
      <div className="cad-preview-toolbar">
        <button type="button" className="cad-tool-btn" onClick={fitToView} aria-label={locale === "ar" ? "ملاءمة الرسم" : "Fit to view"}>
          {locale === "ar" ? "ملاءمة" : "Fit"}
        </button>
        <button type="button" className="cad-tool-btn" onClick={() => setTransform((t) => ({ ...t, scale: Math.min(50, t.scale * 1.5) }))} aria-label={locale === "ar" ? "تكبير" : "Zoom in"}>
          +
        </button>
        <button type="button" className="cad-tool-btn" onClick={() => setTransform((t) => ({ ...t, scale: Math.max(0.01, t.scale / 1.5) }))} aria-label={locale === "ar" ? "تصغير" : "Zoom out"}>
          −
        </button>
        <span className="cad-preview-zoom">{zoomLevel}×</span>
        {measure && <span className="cad-preview-measure">{measure}</span>}
      </div>
      <div className="cad-preview-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="cad-preview-canvas"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        {hover && (
          <div className="cad-preview-coords" dir="ltr">
            X: {hover.x}  Y: {hover.y}
          </div>
        )}
      </div>
    </div>
  );
}
