"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { PAIN_SERIES, type PainPoint } from "@/components/sessions/session-utils";

const PLOT_H = 184;
const TICKS = [10, 5, 0];

type Key = keyof typeof PAIN_SERIES;
const KEYS: Key[] = ["before", "after"];

/** Leyenda del gráfico (rectángulos: la marca son barras). */
export function PainLegend({ className }: { className?: string }) {
  return (
    <ul
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted", className)}
      aria-label="Referencias"
    >
      {KEYS.map((k) => (
        <li key={k} className="inline-flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-3.5 rounded-[3px]" style={{ backgroundColor: PAIN_SERIES[k].color }} />
          Dolor {PAIN_SERIES[k].label.toLowerCase()}
        </li>
      ))}
    </ul>
  );
}

function Bar({ value, color, dim }: { value: number | null; color: string; dim: boolean }) {
  if (value == null) {
    // Sin registro: marca mínima neutra en la línea base.
    return (
      <span
        aria-hidden
        className="h-[3px] w-3.5 rounded-full bg-line-strong sm:w-4 print:w-auto print:max-w-3.5 print:min-w-px print:flex-1"
      />
    );
  }
  const h = Math.max(3, (value / 10) * PLOT_H);
  return (
    <span
      aria-hidden
      className={cn(
        // Al imprimir, las barras se achican para que entren todas las sesiones en el ancho.
        "w-3.5 rounded-t-[4px] transition-[opacity,height] duration-300 sm:w-4 print:w-auto print:max-w-3.5 print:min-w-px print:flex-1",
        dim ? "opacity-35" : "opacity-100",
      )}
      style={{ height: h, backgroundColor: color }}
    />
  );
}

/**
 * Barras agrupadas de dolor (EVA 0-10) por sesión: naranja = al inicio, azul = al final.
 * Scroll horizontal si hay muchas sesiones, tooltip al pasar el mouse / tocar / con flechas,
 * tabla equivalente para lectores de pantalla. Al imprimir, todas las barras entran en el ancho
 * y se muestran a lo sumo `printMaxLabels` fechas (menos si el gráfico va en una columna angosta).
 */
export function PainBarsChart({
  points,
  className,
  printMaxLabels = 14,
}: {
  points: PainPoint[];
  className?: string;
  printMaxLabels?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [tip, setTip] = useState<{ left: number; top: number } | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const n = points.length;

  // Arrancar mostrando las sesiones más recientes y marcar con un fundido los bordes con más contenido.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [n]);

  const mask =
    edges.left || edges.right
      ? `linear-gradient(to right, ${edges.left ? "transparent, #000 28px" : "#000"}, ${edges.right ? "#000 calc(100% - 28px), transparent" : "#000"})`
      : undefined;

  // Posición del tooltip (fuera del contenedor con scroll para que no se recorte).
  useEffect(() => {
    if (active == null) return;
    const update = () => {
      const wrap = wrapRef.current;
      const group = groupRefs.current[active];
      if (!wrap || !group) return;
      const w = wrap.getBoundingClientRect();
      const g = group.getBoundingClientRect();
      const p = points[active];
      const max = Math.max(p.before ?? 0, p.after ?? 0);
      const center = g.left - w.left + g.width / 2;
      // Fuera de la zona visible del scroll: ocultar.
      const s = scrollRef.current?.getBoundingClientRect();
      if (s && (g.left + g.width / 2 < s.left || g.left + g.width / 2 > s.right)) {
        setTip(null);
        return;
      }
      // El tooltip mide ~150px: mantenerlo dentro del ancho del gráfico.
      const left = Math.max(76, Math.min(center, w.width - 76));
      setTip({ left, top: g.top - w.top + PLOT_H - (max / 10) * PLOT_H - 10 });
    };
    update();
    const el = scrollRef.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [active, points]);

  const focusIndex = (i: number) => {
    const next = Math.max(0, Math.min(n - 1, i));
    setActive(next);
    groupRefs.current[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (n === 0) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusIndex(active == null ? n - 1 : active + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusIndex(active == null ? n - 1 : active - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusIndex(n - 1);
    } else if (e.key === "Escape") {
      setActive(null);
    }
  };

  if (n === 0) {
    return (
      <div
        className={cn(
          "flex h-[220px] flex-col items-center justify-center rounded-panel bg-surface-2 px-6 text-center",
          className,
        )}
      >
        <p className="text-[15px] font-medium text-ink">Todavía no hay registros de dolor</p>
        <p className="mt-1 max-w-xs text-sm text-muted">
          Puntuá el dolor al inicio y al final de cada sesión para ver la evolución acá.
        </p>
      </div>
    );
  }

  const activePoint = active != null ? points[active] : null;
  const last = n - 1;
  // Al imprimir, si hay muchas sesiones mostramos una etiqueta de fecha cada tanto.
  const printLabelEvery = Math.max(1, Math.ceil(n / Math.max(1, printMaxLabels)));
  // La última etiqueta siempre se muestra: ocultar la anterior visible si quedaría pegada.
  const lastLabeled = Math.floor((n - 1) / printLabelEvery) * printLabelEvery;
  const hideBeforeLast = n > 1 && lastLabeled !== last && last - lastLabeled < printLabelEvery;

  return (
    <div className={cn("relative [print-color-adjust:exact] [-webkit-print-color-adjust:exact]", className)}>
      <div
        ref={wrapRef}
        tabIndex={0}
        role="group"
        aria-label="Gráfico de la EVA de cada sesión. Usá las flechas para recorrer las sesiones."
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setActive(null);
        }}
        className="relative flex rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
      >
        {/* Eje Y */}
        <div aria-hidden className="relative mr-2 w-5 shrink-0" style={{ height: PLOT_H }}>
          {TICKS.map((t) => (
            <span
              key={t}
              className="tabular absolute right-0 -translate-y-1/2 text-[11px] leading-none text-muted"
              style={{ top: PLOT_H - (t / 10) * PLOT_H }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Grilla */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0" style={{ height: PLOT_H }}>
            {TICKS.map((t) => (
              <span
                key={t}
                className={cn("absolute inset-x-0 h-px", t === 0 ? "bg-line-strong" : "bg-line")}
                style={{ top: PLOT_H - (t / 10) * PLOT_H }}
              />
            ))}
          </div>

          <div
            ref={scrollRef}
            className="scrollbar-none overflow-x-auto overscroll-x-contain print:overflow-visible print:[mask-image:none]! print:[-webkit-mask-image:none]!"
            style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
          >
            <div className="flex min-w-full">
              {points.map((p, i) => {
                const isActive = active === i;
                const dim = active != null && !isActive;
                return (
                  <div
                    key={p.id}
                    ref={(el) => {
                      groupRefs.current[i] = el;
                    }}
                    onPointerEnter={() => setActive(i)}
                    onPointerDown={() => setActive(i)}
                    className="group relative flex min-w-[52px] flex-1 cursor-default flex-col items-center print:min-w-0"
                  >
                    <div
                      className={cn(
                        "relative flex w-full items-end justify-center gap-[2px] rounded-t-xl transition-colors",
                        isActive && "bg-ink/[0.04]",
                      )}
                      style={{ height: PLOT_H }}
                    >
                      {i === last && !isActive ? (
                        <span
                          aria-hidden
                          className="tabular absolute inset-x-0 flex justify-center gap-[2px] text-[11px] font-medium text-ink-2"
                          style={{ bottom: (Math.max(p.before ?? 0, p.after ?? 0) / 10) * PLOT_H + 6 }}
                        >
                          <span className="w-3.5 text-center sm:w-4">{p.before ?? "–"}</span>
                          <span className="w-3.5 text-center sm:w-4">{p.after ?? "–"}</span>
                        </span>
                      ) : null}
                      {KEYS.map((k) => (
                        <Bar key={k} value={p[k]} color={PAIN_SERIES[k].color} dim={dim} />
                      ))}
                    </div>
                    <span
                      className={cn(
                        "tabular mt-2 text-[11px] whitespace-nowrap transition-colors",
                        isActive ? "font-semibold text-ink" : "text-muted",
                        ((i % printLabelEvery !== 0 && i !== last) || (hideBeforeLast && i === lastLabeled)) &&
                          "print:invisible",
                      )}
                    >
                      {p.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {activePoint && tip ? (
        <div
          role="status"
          className="pointer-events-none absolute z-10 w-max min-w-36 -translate-x-1/2 -translate-y-full animate-fade-in rounded-2xl bg-ink px-3.5 py-2.5 text-white shadow-float print:hidden"
          style={{ left: tip.left, top: tip.top }}
        >
          <p className="text-[12px] text-white/65">
            Sesión {activePoint.number} · {activePoint.label}
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            {KEYS.map((k) => (
              <p key={k} className="flex items-center gap-2 text-[13px]">
                <span
                  aria-hidden
                  className="h-[3px] w-3 rounded-full"
                  style={{ backgroundColor: PAIN_SERIES[k].color }}
                />
                <span className="tabular min-w-5 font-semibold">{activePoint[k] ?? "—"}</span>
                <span className="text-white/65">{PAIN_SERIES[k].label.toLowerCase()}</span>
              </p>
            ))}
          </div>
          {activePoint.before != null && activePoint.after != null ? (
            <p className="mt-1.5 border-t border-white/10 pt-1.5 text-[12px] text-white/80">
              {activePoint.after < activePoint.before
                ? `Bajó ${activePoint.before - activePoint.after} ${activePoint.before - activePoint.after === 1 ? "punto" : "puntos"}`
                : activePoint.after > activePoint.before
                  ? `Subió ${activePoint.after - activePoint.before} ${activePoint.after - activePoint.before === 1 ? "punto" : "puntos"}`
                  : "Sin cambios en la sesión"}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Tabla equivalente (lectores de pantalla). El sr-only va en un div: una tabla no se achica a 1px. */}
      <div className="sr-only">
        <table>
          <caption>EVA de cada sesión (0 = sin dolor, 10 = el peor dolor imaginable)</caption>
          <thead>
            <tr>
              <th scope="col">Sesión</th>
              <th scope="col">Fecha</th>
              <th scope="col">Dolor al inicio</th>
              <th scope="col">Dolor al final</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id}>
                <td>{p.number}</td>
                <td>{p.longLabel}</td>
                <td>{p.before ?? "Sin registro"}</td>
                <td>{p.after ?? "Sin registro"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
