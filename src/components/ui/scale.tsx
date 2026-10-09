"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { PAIN_SCALE_LABELS } from "@/lib/constants";
import { cn, painColor } from "@/lib/utils";

type Props = {
  /** Valor mínimo (0 para EVA, 1 para puntuaciones 1-10). */
  min?: number;
  max?: number;
  value?: number | null;
  defaultValue?: number | null;
  onChange?: (value: number | null) => void;
  name?: string;
  /** "pain" colorea los segmentos con la escala de dolor; "ink" usa negro; o un color hex. */
  tone?: "pain" | "ink" | string;
  /** Título (p. ej. "Dolor al inicio"). */
  label?: string;
  /** Subtítulo (p. ej. "¿Cuánto dolor refiere?"). */
  description?: string;
  /** Color del punto junto al título. */
  dot?: string;
  /** Muestra el valor grande "7/10" arriba a la derecha. */
  showValue?: boolean;
  /**
   * Permite dejar la escala sin valor: tocar de nuevo el valor elegido (con mouse o dedo) lo borra,
   * y aparece el botón "Borrar" (accesible por teclado).
   */
  allowEmpty?: boolean;
  className?: string;
  compact?: boolean;
};

/**
 * Escala segmentada (como los bloques Placer / Control de daily).
 * Accesible como radiogroup (patrón WAI-ARIA): un solo tab stop, flechas / Inicio / Fin para
 * cambiar el valor. Envía el valor en un <input type="hidden">.
 */
export function ScaleBar({
  min = 0,
  max = 10,
  value,
  defaultValue = null,
  onChange,
  name,
  tone = "ink",
  label,
  description,
  dot,
  showValue = true,
  allowEmpty = true,
  className,
  compact = false,
}: Props) {
  const [internal, setInternal] = useState<number | null>(defaultValue);
  const current = value !== undefined ? value : internal;
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const labelId = `${uid}-label`;
  const descId = `${uid}-desc`;

  const commit = (next: number | null) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const fillFor = (step: number) => {
    if (current == null || step > current) return undefined;
    if (tone === "pain") return painColor(step);
    if (tone === "ink") return "var(--color-ink)";
    return tone;
  };

  const stepLabel = (step: number) => {
    const anchor = tone === "pain" ? PAIN_SCALE_LABELS[step] : undefined;
    return `${step} de ${max}${anchor ? `, ${anchor}` : ""}`;
  };

  const focusStep = (step: number) => {
    commit(step);
    buttons.current[step - min]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const base = current ?? min - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = current == null ? min : Math.min(max, base + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = current == null ? min : Math.max(min, base - 1);
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    if (next == null) return;
    e.preventDefault();
    focusStep(next);
  };

  // Tab stop: el valor elegido o, si no hay, el primero.
  const tabStop = current ?? min;
  const canClear = allowEmpty && current != null;

  return (
    <div className={cn("rounded-panel bg-surface-2", compact ? "p-4" : "p-5", className)}>
      {(label || showValue || canClear) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {label ? (
              <p id={labelId} className="flex items-center gap-2 text-[17px] font-medium text-ink">
                {dot ? <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: dot }} /> : null}
                {label}
              </p>
            ) : null}
            {description ? (
              <p id={descId} className={cn("mt-0.5 text-sm text-muted", dot && "pl-[18px]")}>
                {description}
              </p>
            ) : null}
          </div>
          {showValue || canClear ? (
            <div className="flex shrink-0 items-center gap-1">
              {canClear ? (
                <button
                  type="button"
                  onClick={() => commit(null)}
                  className="relative hit-area -my-1 rounded-full px-2.5 py-1 text-[13px] font-medium text-muted transition-colors hover:bg-surface-3 hover:text-ink"
                  aria-label={label ? `Borrar ${label.toLowerCase()}` : "Borrar valor"}
                >
                  Borrar
                </button>
              ) : null}
              {showValue ? (
                <p className="display tabular text-ink" aria-hidden>
                  <span className="text-[26px] font-medium">{current ?? "—"}</span>
                  <span className="text-base text-muted">/{max}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
      <div
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : "Escala"}
        aria-describedby={description ? descId : undefined}
        onKeyDown={onKeyDown}
        className="flex gap-1.5"
      >
        {steps.map((step) => {
          const fill = fillFor(step);
          const active = current === step;
          return (
            <button
              key={step}
              ref={(el) => {
                buttons.current[step - min] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={stepLabel(step)}
              tabIndex={step === tabStop ? 0 : -1}
              onClick={(e) => {
                // Tocar de nuevo el valor elegido lo borra solo con puntero (e.detail > 0);
                // con teclado (Espacio/Enter) un radio elegido sigue elegido.
                if (allowEmpty && active && e.detail > 0) commit(null);
                else commit(step);
              }}
              className="group flex min-h-10 min-w-0 flex-1 flex-col items-center justify-center gap-2 py-1 outline-none"
            >
              <span
                className={cn(
                  "h-2.5 w-full rounded-full transition-[background-color,transform] duration-150 group-hover:scale-y-125 group-focus-visible:ring-2 group-focus-visible:ring-ink group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-surface-2",
                  !fill && "bg-line-strong/70 group-hover:bg-line-strong",
                )}
                style={fill ? { backgroundColor: fill } : undefined}
              />
              <span
                className={cn(
                  "tabular rounded-md px-1 text-[13px] transition-colors group-focus-visible:bg-ink group-focus-visible:text-white",
                  active ? "font-semibold text-ink" : "text-muted",
                )}
              >
                {step}
              </span>
            </button>
          );
        })}
      </div>
      {name ? <input type="hidden" name={name} value={current ?? ""} /> : null}
    </div>
  );
}
