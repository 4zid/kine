"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { PainEvolutionPoint } from "@/lib/data/patients-types";
import { cn, formatDate } from "@/lib/utils";
import { PAIN_SERIES, PAIN_SERIES_KEYS, type PainSeriesKey } from "@/components/patients/pain-series";

const SERIES = PAIN_SERIES;

const HEIGHT = 196;
const PAD = { top: 14, right: 34, bottom: 30, left: 30 };
const MAX_POINTS = 24;

type Key = PainSeriesKey;

function segments(points: { x: number; y: number | null }[]): string[] {
  const out: string[] = [];
  let current: string[] = [];
  for (const p of points) {
    if (p.y == null) {
      if (current.length > 1) out.push(current.join(" "));
      current = [];
      continue;
    }
    current.push(`${current.length === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  if (current.length > 1) out.push(current.join(" "));
  return out;
}

/** Línea de EVA (0-10) antes y después de cada sesión, con crosshair y tooltip. */
export function PainEvolutionChart({ points: allPoints, className }: { points: PainEvolutionPoint[]; className?: string }) {
  const points = allPoints.slice(-MAX_POINTS);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(520);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = Math.max(40, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const n = points.length;
  const xAt = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => PAD.top + innerH - (v / 10) * innerH;

  const series = (key: Key) => points.map((p, i) => ({ x: xAt(i), y: p[key] == null ? null : yAt(p[key] as number) }));

  const lastIndex = (key: Key) => {
    for (let i = n - 1; i >= 0; i--) if (points[i][key] != null) return i;
    return -1;
  };

  const indexFromClientX = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return null;
    const x = clientX - rect.left;
    if (n === 1) return 0;
    const i = Math.round(((x - PAD.left) / innerW) * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  };

  const onPointerMove = (e: PointerEvent<SVGRectElement>) => setActive(indexFromClientX(e.clientX));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (n === 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const delta = e.key === "ArrowRight" ? 1 : -1;
      setActive((prev) => Math.max(0, Math.min(n - 1, (prev ?? (delta > 0 ? -1 : n)) + delta)));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(n - 1);
    } else if (e.key === "Escape") {
      setActive(null);
    }
  };

  const activePoint = active != null ? points[active] : null;
  const TOOLTIP_W = 140;
  const tooltipLeft =
    active != null
      ? xAt(active) + 14 + TOOLTIP_W > width
        ? Math.max(0, xAt(active) - 14 - TOOLTIP_W)
        : xAt(active) + 14
      : 0;

  // Etiquetas directas del último punto: separarlas si quedan encimadas.
  const lastBefore = lastIndex("before");
  const lastAfter = lastIndex("after");
  const labelOffset: Record<Key, number> = { before: 0, after: 0 };
  if (lastBefore >= 0 && lastBefore === lastAfter) {
    const yb = yAt(points[lastBefore].before as number);
    const ya = yAt(points[lastAfter].after as number);
    if (Math.abs(yb - ya) < 14) {
      const upper: Key = (points[lastBefore].before as number) >= (points[lastAfter].after as number) ? "before" : "after";
      const lower: Key = upper === "before" ? "after" : "before";
      const mid = (yb + ya) / 2;
      labelOffset[upper] = mid - 7 - (upper === "before" ? yb : ya);
      labelOffset[lower] = mid + 7 - (lower === "before" ? yb : ya);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={wrapRef}
        tabIndex={0}
        role="group"
        aria-label={`Evolución del dolor en ${n} ${n === 1 ? "sesión" : "sesiones"}. Usá las flechas para recorrer las sesiones.`}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        className="relative rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
      >
        <svg width="100%" height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} aria-hidden className="block overflow-visible">
          {/* Grilla recesiva */}
          {[0, 5, 10].map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={PAD.left + innerW}
                y1={yAt(v)}
                y2={yAt(v)}
                stroke="var(--color-line)"
                strokeDasharray={v === 0 ? undefined : "3 5"}
              />
              <text x={PAD.left - 10} y={yAt(v) + 4} textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {v}
              </text>
            </g>
          ))}

          {/* Fechas extremas */}
          {n > 0 ? (
            <>
              <text x={xAt(0)} y={HEIGHT - 8} textAnchor={n === 1 ? "middle" : "start"} className="fill-muted text-[11px]">
                {formatDate(points[0].date, { withYear: false })}
              </text>
              {n > 1 ? (
                <text x={xAt(n - 1)} y={HEIGHT - 8} textAnchor="end" className="fill-muted text-[11px]">
                  {formatDate(points[n - 1].date, { withYear: false })}
                </text>
              ) : null}
            </>
          ) : null}

          {/* Crosshair */}
          {active != null ? (
            <line
              x1={xAt(active)}
              x2={xAt(active)}
              y1={PAD.top - 4}
              y2={PAD.top + innerH}
              stroke="var(--color-ink)"
              strokeOpacity="0.18"
            />
          ) : null}

          {PAIN_SERIES_KEYS.map((key) => {
            const pts = series(key);
            const last = lastIndex(key);
            return (
              <g key={key}>
                {segments(pts).map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={SERIES[key].color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
                {/* Puntos aislados (sin vecinos) para que no desaparezcan */}
                {pts.map((p, i) =>
                  p.y != null && pts[i - 1]?.y == null && pts[i + 1]?.y == null && i !== last ? (
                    <circle key={i} cx={p.x} cy={p.y} r={3} fill={SERIES[key].color} />
                  ) : null,
                )}
                {last >= 0 && pts[last].y != null ? (
                  <>
                    <circle
                      cx={pts[last].x}
                      cy={pts[last].y as number}
                      r={4.5}
                      fill={SERIES[key].color}
                      stroke="var(--color-surface)"
                      strokeWidth={2}
                    />
                    <text
                      x={pts[last].x + 10}
                      y={(pts[last].y as number) + 4 + labelOffset[key]}
                      className="fill-ink text-[12px] font-semibold tabular-nums"
                    >
                      {points[last][key]}
                    </text>
                  </>
                ) : null}
                {active != null && pts[active].y != null ? (
                  <circle
                    cx={pts[active].x}
                    cy={pts[active].y as number}
                    r={5}
                    fill={SERIES[key].color}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  />
                ) : null}
              </g>
            );
          })}

          {/* Capa de interacción (más grande que las marcas) */}
          <rect
            x={0}
            y={0}
            width={width}
            height={HEIGHT}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerDown={onPointerMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>

        {activePoint ? (
          <div
            className="pointer-events-none absolute z-10 rounded-xl bg-ink px-3 py-2.5 text-white shadow-float"
            style={{ left: tooltipLeft, top: PAD.top, width: TOOLTIP_W }}
          >
            <p className="text-[11px] text-white/80">{formatDate(activePoint.date)}</p>
            {PAIN_SERIES_KEYS.map((key) => (
              <p key={key} className="mt-1 flex items-center gap-2 text-[12px]">
                <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ backgroundColor: SERIES[key].color }} />
                <span className="tabular font-semibold">{activePoint[key] ?? "—"}</span>
                <span className="text-white/80">{SERIES[key].label.toLowerCase()}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <p aria-live="polite" className="sr-only">
        {activePoint
          ? `${formatDate(activePoint.date)}: al inicio ${activePoint.before ?? "sin dato"}, al final ${activePoint.after ?? "sin dato"}.`
          : ""}
      </p>

      {/* Vista de tabla para lectores de pantalla */}
      <table className="sr-only">
        <caption>EVA por sesión</caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Al inicio</th>
            <th scope="col">Al final</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.id}>
              <td>{formatDate(p.date)}</td>
              <td>{p.before ?? "—"}</td>
              <td>{p.after ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
