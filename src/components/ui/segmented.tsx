"use client";

import { useState, type ReactNode } from "react";
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
};

/** Control segmentado tipo píldora. */
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

  return (
    <div
      role="radiogroup"
      aria-label={aria["aria-label"]}
      className={cn(
        "inline-flex items-center gap-1 rounded-full p-1",
        tone === "dark" ? "bg-ink" : "bg-surface-2 shadow-inset",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (value === undefined) setInternal(o.value);
              onChange?.(o.value);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 [&_svg]:size-4",
              size === "md" ? "h-9 px-4 text-sm" : "h-8 px-3 text-[13px]",
              tone === "dark"
                ? active
                  ? "bg-white text-ink"
                  : "text-white/70 hover:text-white"
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
