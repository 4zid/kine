"use client";

import { memo, useId, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { getRegion } from "@/lib/body-regions";
import { PAIN_STATUS } from "@/lib/constants";
import type { BodyView } from "@/lib/types";
import { cn, painColor, painTextColor } from "@/lib/utils";
import { FIGURE, isPainful, isResolved, regionAriaLabel, regionFill } from "./figure-style";
import { BODY_GEOMETRY, VIEWBOX_HEIGHT, VIEWBOX_WIDTH, getRegionShape, toPercent } from "./geometry";
import { asPainStatus } from "./pain-state";
import type { RegionPaint } from "./types";

export type DraftPoint = { region: string; x: number; y: number };

type Props = {
  view: BodyView;
  paint: Record<string, RegionPaint>;
  selectedId: string | null;
  draftPoint: DraftPoint | null;
  showResolved: boolean;
  /** `point` en coordenadas del viewBox; null si se eligió con teclado. */
  onSelect: (regionId: string, point: [number, number] | null) => void;
  /** Etiquetas "Der." / "Izq." a los costados. */
  sideLabels?: boolean;
  className?: string;
};

const VIEW_NAMES: Record<BodyView, string> = { front: "Vista de frente", back: "Vista de espalda" };

/**
 * Figura interactiva (una vista). Cada zona es un botón accesible del SVG; el tooltip y las
 * etiquetas son HTML superpuesto con el mismo aspect ratio que el viewBox.
 */
export const BodyFigure = memo(function BodyFigure({
  view,
  paint,
  selectedId,
  draftPoint,
  showResolved,
  onSelect,
  sideLabels = true,
  className,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const geometry = BODY_GEOMETRY[view];
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<{ id: string; visible: boolean } | null>(null);

  const pointFromEvent = (e: MouseEvent<SVGElement>): [number, number] | null => {
    const svg = (e.currentTarget as SVGGraphicsElement).ownerSVGElement;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm || e.detail === 0) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    if (p.x < 0 || p.y < 0 || p.x > VIEWBOX_WIDTH || p.y > VIEWBOX_HEIGHT) return null;
    return [p.x, p.y];
  };

  const handlers = (id: string) => ({
    onClick: (e: MouseEvent<SVGPathElement>) => onSelect(id, pointFromEvent(e)),
    onPointerEnter: (e: PointerEvent<SVGPathElement>) => {
      if (e.pointerType === "mouse") setHovered(id);
    },
    onPointerLeave: () => setHovered((h) => (h === id ? null : h)),
  });

  const onKeyDown = (id: string) => (e: KeyboardEvent<SVGPathElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id, null);
    }
  };

  const tooltipId = hovered ?? (focused?.visible ? focused.id : null);
  const tooltipShape = getRegionShape(tooltipId);
  const tooltipPaint = tooltipId ? paint[tooltipId] : undefined;
  const leftLabel = view === "front" ? "Der." : "Izq.";
  const rightLabel = view === "front" ? "Izq." : "Der.";

  const visiblePaint = (id: string) => {
    const p = paint[id];
    if (!p) return undefined;
    if (isResolved(p) && !showResolved) return undefined;
    return p;
  };

  return (
    <div
      className={cn("relative select-none", className)}
      style={{ aspectRatio: `${VIEWBOX_WIDTH} / ${VIEWBOX_HEIGHT}` }}
    >
      <svg
        viewBox={geometry.viewBox}
        role="group"
        aria-label={VIEW_NAMES[view]}
        className="absolute inset-0 h-full w-full overflow-visible"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <defs>
          <radialGradient id={`${uid}-shade`} cx="36%" cy="26%" r="85%">
            <stop offset="0" stopColor="#fff" stopOpacity="0.42" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0.06" />
            <stop offset="1" stopColor={FIGURE.ink} stopOpacity="0.05" />
          </radialGradient>
          <radialGradient id={`${uid}-floor`}>
            <stop offset="0" stopColor={FIGURE.ink} stopOpacity="0.12" />
            <stop offset="1" stopColor={FIGURE.ink} stopOpacity="0" />
          </radialGradient>
          <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id={`${uid}-lift`} x="-20%" y="-10%" width="140%" height="125%">
            <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor={FIGURE.ink} floodOpacity="0.07" />
          </filter>
        </defs>

        {/* Sombra de piso + silueta flotante */}
        <ellipse cx={VIEWBOX_WIDTH / 2} cy={772} rx={78} ry={7} fill={`url(#${uid}-floor)`} />
        <path d={geometry.outline} fill={FIGURE.neutral} filter={`url(#${uid}-lift)`} />

        {/* Zonas interactivas */}
        <g>
          {geometry.regions.map((r) => {
            const p = visiblePaint(r.id);
            return (
              <path
                key={r.id}
                d={r.d}
                data-region={r.id}
                role="button"
                tabIndex={0}
                aria-pressed={selectedId === r.id}
                aria-label={regionAriaLabel(r.id, paint[r.id])}
                fill={regionFill(p, showResolved)}
                stroke={FIGURE.gap}
                strokeWidth={1.6}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer outline-none transition-[fill,filter] duration-200 hover:brightness-[0.94]"
                {...handlers(r.id)}
                onKeyDown={onKeyDown(r.id)}
                onFocus={(e) => setFocused({ id: r.id, visible: e.currentTarget.matches(":focus-visible") })}
                onBlur={() => setFocused((f) => (f?.id === r.id ? null : f))}
              />
            );
          })}
        </g>

        {/* Relieve suave (todas las zonas) */}
        <g pointerEvents="none" aria-hidden>
          {geometry.regions.map((r) => (
            <path key={r.id} d={r.d} fill={`url(#${uid}-shade)`} />
          ))}
        </g>

        {/* Resplandor de las zonas con dolor */}
        <g
          pointerEvents="none"
          aria-hidden
          filter={`url(#${uid}-glow)`}
          opacity={0.5}
          style={{ mixBlendMode: "multiply" }}
        >
          {geometry.regions.map((r) => {
            const p = paint[r.id];
            return isPainful(p) ? <path key={r.id} d={r.d} fill={painColor(p.intensity)} /> : null;
          })}
        </g>

        {/* Áreas táctiles ampliadas para zonas chicas */}
        <g aria-hidden>
          {geometry.regions
            .filter((r) => r.small)
            .map((r) => (
              <path
                key={r.id}
                d={r.d}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                pointerEvents="stroke"
                className="cursor-pointer"
                {...handlers(r.id)}
              />
            ))}
        </g>

        {/* Contornos: resueltos, seleccionada, foco */}
        <g pointerEvents="none" aria-hidden fill="none" strokeLinejoin="round">
          {showResolved
            ? geometry.regions.map((r) =>
                isResolved(paint[r.id]) ? (
                  <path
                    key={r.id}
                    d={r.d}
                    stroke={FIGURE.resolvedStroke}
                    strokeWidth={1.6}
                    strokeDasharray="4 3"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null,
              )
            : null}
          {selectedId && getRegionShape(selectedId) && geometry.regions.some((r) => r.id === selectedId) ? (
            <path
              d={getRegionShape(selectedId)!.d}
              stroke={FIGURE.ink}
              strokeWidth={2.4}
              vectorEffect="non-scaling-stroke"
              className="animate-fade-in"
            />
          ) : null}
          {focused?.visible && focused.id !== selectedId && getRegionShape(focused.id) ? (
            <>
              <path d={getRegionShape(focused.id)!.d} stroke="#fff" strokeWidth={6} vectorEffect="non-scaling-stroke" />
              <path
                d={getRegionShape(focused.id)!.d}
                stroke={FIGURE.ink}
                strokeWidth={2.4}
                strokeDasharray="5 3"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : null}
        </g>

        {/* Marcadores: pulso (EVA ≥ 7 activo), tendencia (mejorando) y pines */}
        <g pointerEvents="none" aria-hidden>
          {geometry.regions.map((r) => {
            const p = paint[r.id];
            if (!isPainful(p)) return null;
            const at = p.point ?? r.anchor;
            const color = painColor(p.intensity);
            const status = asPainStatus(p.status);
            return (
              <g key={r.id}>
                {status === "active" && p.intensity >= 7 ? (
                  <circle
                    cx={at[0]}
                    cy={at[1]}
                    r={13}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.5}
                    opacity={0.45}
                    className="motion-safe:animate-pulse-ring"
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />
                ) : null}
                {p.point ? (
                  <circle cx={at[0]} cy={at[1]} r={5} fill={color} stroke="#fff" strokeWidth={2.2} />
                ) : null}
                {status === "improving" ? <TrendBadge x={r.anchor[0]} y={r.anchor[1]} offset={p.point != null} /> : null}
              </g>
            );
          })}
          {draftPoint && geometry.regions.some((r) => r.id === draftPoint.region) ? (
            <g>
              <circle
                cx={draftPoint.x}
                cy={draftPoint.y}
                r={11}
                fill={FIGURE.ink}
                opacity={0.18}
                className="motion-safe:animate-pulse-ring"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
              <circle cx={draftPoint.x} cy={draftPoint.y} r={5.5} fill={FIGURE.ink} stroke="#fff" strokeWidth={2.4} />
            </g>
          ) : null}
        </g>
      </svg>

      {sideLabels ? (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute top-[15.5%] left-0 text-[11px] font-medium tracking-wide text-subtle"
          >
            {leftLabel}
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute top-[15.5%] right-0 text-[11px] font-medium tracking-wide text-subtle"
          >
            {rightLabel}
          </span>
        </>
      ) : null}

      {tooltipShape && tooltipId ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] animate-fade-in"
          style={toPercent(tooltipShape.anchor[0], tooltipShape.anchor[1])}
        >
          <div className="flex items-center gap-2 rounded-full bg-ink py-1.5 pr-2 pl-3 text-[13px] font-medium whitespace-nowrap text-white shadow-float">
            <span>{getRegion(tooltipId)?.short}</span>
            {isPainful(tooltipPaint) ? (
              <span
                className="tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold"
                style={{ backgroundColor: painColor(tooltipPaint.intensity), color: painTextColor(tooltipPaint.intensity) }}
              >
                {tooltipPaint.intensity}
              </span>
            ) : tooltipPaint && isResolved(tooltipPaint) ? (
              <span className="pr-1 text-[11px] text-white/60">{PAIN_STATUS.resolved.label}</span>
            ) : (
              <span className="pr-1 text-[11px] text-white/55">Sin dolor</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
});

function TrendBadge({ x, y, offset }: { x: number; y: number; offset: boolean }) {
  const cx = offset ? x + 9 : x;
  const cy = offset ? y - 9 : y;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={7.5} fill="#fff" />
      <path
        d="M-3 -3 L3 3 M3 -0.6 L3 3 L-0.6 3"
        fill="none"
        stroke={PAIN_STATUS.resolved.color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
