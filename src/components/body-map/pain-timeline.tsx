"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn, formatDate, formatLongDate, painColor } from "@/lib/utils";

type Props = {
  /** Días con registros ("YYYY-MM-DD", ascendentes). */
  days: string[];
  /** EVA promedio de las zonas activas en cada día (colorea los segmentos). */
  dayLevel: (number | null)[];
  index: number;
  onChange: (index: number) => void;
  className?: string;
};

/**
 * Línea de tiempo "Evolución": barras segmentadas (una por día con registros). Moverla muestra el
 * mapa a esa fecha. Accesible como slider (flechas, Inicio/Fin) y arrastrable con el puntero.
 */
export function PainTimeline({ days, dayLevel, index, onChange, className }: Props) {
  const last = days.length - 1;
  const [playing, setPlaying] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ index, last, onChange });

  useEffect(() => {
    latest.current = { index, last, onChange };
  });

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const { index: i, last: l, onChange: change } = latest.current;
      if (i >= l) {
        setPlaying(false);
        return;
      }
      change(i + 1);
    }, 900);
    return () => window.clearInterval(timer);
  }, [playing]);

  if (days.length < 2) return null;

  const isCurrent = index === last;
  const set = (i: number) => onChange(Math.max(0, Math.min(last, i)));

  const fromPointer = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    set(Math.floor(Math.max(0, Math.min(0.9999, ratio)) * days.length));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    setPlaying(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    fromPointer(e.clientX);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      PageDown: index - 3,
      PageUp: index + 3,
      Home: 0,
      End: last,
    };
    if (e.key in map) {
      e.preventDefault();
      setPlaying(false);
      set(map[e.key]);
    }
  };

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink-2">Evolución</p>
          <p className="truncate text-[13px] text-muted" aria-live="polite">
            {isCurrent ? (
              <>
                Estado actual · <span className="text-ink-2">{formatDate(days[index], { withYear: false })}</span>
              </>
            ) : (
              <>
                Al <span className="font-medium text-ink">{formatDate(days[index], { withYear: false })}</span> · día{" "}
                {index + 1} de {days.length}
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!isCurrent && !playing ? (
            <button
              type="button"
              onClick={() => set(last)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface-3"
            >
              <RotateCcw aria-hidden className="size-3.5" />
              Actual
            </button>
          ) : null}
          <button
            type="button"
            aria-label={playing ? "Pausar evolución" : "Reproducir evolución"}
            aria-pressed={playing}
            onClick={() => {
              if (playing) {
                setPlaying(false);
                return;
              }
              if (isCurrent) onChange(0);
              setPlaying(true);
            }}
            className="inline-flex size-10 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-ink-2"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Fecha del mapa"
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={index}
        aria-valuetext={formatLongDate(days[index])}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e.clientX);
        }}
        className="group flex cursor-pointer touch-none gap-1 rounded-full py-2 outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
      >
        {days.map((d, i) => {
          const level = dayLevel[i];
          const filled = i <= index;
          return (
            <span
              key={d}
              className={cn(
                "h-2 min-w-0 flex-1 rounded-full transition-[background-color,transform] duration-300",
                i === index && "scale-y-150",
                !filled && "bg-line-strong/70",
              )}
              style={filled ? { backgroundColor: level != null ? painColor(level) : "var(--color-success)" } : undefined}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-subtle">
        <span>{formatDate(days[0], { withYear: false })}</span>
        <span>{formatDate(days[last], { withYear: false })}</span>
      </div>
    </div>
  );
}
