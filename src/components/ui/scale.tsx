"use client";

import { useState } from "react";
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
  /** Permite deseleccionar tocando el mismo valor. */
  allowEmpty?: boolean;
  className?: string;
  compact?: boolean;
};

/**
 * Escala segmentada (como los bloques Placer / Control de daily).
 * Accesible como radiogroup; envía el valor en un <input type="hidden">.
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

  const set = (v: number) => {
    const next = allowEmpty && current === v ? null : v;
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const fillFor = (step: number) => {
    if (current == null || step > current) return undefined;
    if (tone === "pain") return painColor(step);
    if (tone === "ink") return "var(--color-ink)";
    return tone;
  };

  return (
    <div className={cn("rounded-panel bg-surface-2", compact ? "p-4" : "p-5", className)}>
      {(label || showValue) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {label ? (
              <p className="flex items-center gap-2 text-[17px] font-medium text-ink">
                {dot ? <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: dot }} /> : null}
                {label}
              </p>
            ) : null}
            {description ? <p className={cn("mt-0.5 text-sm text-muted", dot && "pl-[18px]")}>{description}</p> : null}
          </div>
          {showValue ? (
            <p className="display tabular shrink-0 text-ink" aria-live="polite">
              <span className="text-[26px] font-medium">{current ?? "—"}</span>
              <span className="text-base text-muted">/{max}</span>
            </p>
          ) : null}
        </div>
      )}
      <div role="radiogroup" aria-label={label ?? "Escala"} className="flex gap-1.5">
        {steps.map((step) => {
          const fill = fillFor(step);
          const active = current === step;
          return (
            <button
              key={step}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${step}`}
              onClick={() => set(step)}
              className="group flex min-w-0 flex-1 flex-col items-center gap-2 py-1 outline-none"
            >
              <span
                className={cn(
                  "h-2.5 w-full rounded-full transition-[background-color,transform] duration-150 group-hover:scale-y-125 group-focus-visible:ring-2 group-focus-visible:ring-ink group-focus-visible:ring-offset-2",
                  !fill && "bg-line-strong/70 group-hover:bg-line-strong",
                )}
                style={fill ? { backgroundColor: fill } : undefined}
              />
              <span className={cn("tabular text-[13px] transition-colors", active ? "font-semibold text-ink" : "text-muted")}>
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
