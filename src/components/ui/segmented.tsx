"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SegmentedOption<V extends string> = { value: V; label: ReactNode; icon?: ReactNode };

type Props<V extends string> = {
  options: SegmentedOption<V>[];
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  name?: string;
  /** "dark" = barra negra con píldora blanca (como Paciente | Terapeuta). */
  tone?: "light" | "dark";
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/**
 * Control segmentado tipo píldora. Accesible como radiogroup (patrón WAI-ARIA): un solo tab stop
 * y flechas / Inicio / Fin para cambiar la opción.
 */
export function SegmentedControl<V extends string>({
  options,
  value,
  defaultValue,
  onChange,
  name,
  tone = "light",
  size = "md",
  className,
  ...aria
}: Props<V>) {
  const [internal, setInternal] = useState<V | undefined>(defaultValue ?? options[0]?.value);
  const current = value ?? internal;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const currentIndex = options.findIndex((o) => o.value === current);
  const tabStop = currentIndex >= 0 ? currentIndex : 0;

  const select = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (value === undefined) setInternal(option.value);
    onChange?.(option.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabStop >= last ? 0 : tabStop + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabStop <= 0 ? last : tabStop - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next == null) return;
    e.preventDefault();
    select(next);
    buttons.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={aria["aria-label"]}
      aria-labelledby={aria["aria-labelledby"]}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex items-center gap-1 rounded-full p-1",
        tone === "dark" ? "bg-ink" : "bg-surface-2 shadow-inset",
        className,
      )}
    >
      {options.map((o, i) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={() => select(i)}
            className={cn(
              // hit-area: objetivo táctil ≥ 40px sin cambiar el alto visual.
              "relative hit-area inline-flex items-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 [&_svg]:size-4",
              size === "md" ? "h-9 px-4 text-sm" : "h-8 px-3 text-[13px]",
              tone === "dark"
                ? cn("focus-visible:outline-white", active ? "bg-white text-ink" : "text-white/75 hover:text-white")
                : active
                  ? "bg-surface text-ink shadow-soft"
                  : "text-muted hover:text-ink",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
      {name && current ? <input type="hidden" name={name} value={current} /> : null}
    </div>
  );
}
