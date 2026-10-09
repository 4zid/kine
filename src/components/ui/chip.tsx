"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type ChipProps = Omit<ComponentProps<"button">, "color"> & {
  selected?: boolean;
  /** Color del punto (opcional). */
  dot?: string;
  size?: "sm" | "md";
};

/** Chip tipo píldora (como las categorías de daily). Seleccionado = negro. */
export function Chip({ selected, dot, size = "md", className, children, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "relative inline-flex items-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,transform] duration-150 select-none active:scale-[0.97]",
        // sm: 32px visuales con área táctil de 40px (hit-area).
        size === "md" ? "h-10 px-4 text-sm" : "hit-area h-8 px-3 text-[13px]",
        selected ? "bg-ink text-white" : "bg-surface-2 text-ink hover:bg-surface-3",
        className,
      )}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: selected && dot === "#7A7A85" ? "#B5B5BD" : dot }}
        />
      ) : null}
      {children}
    </button>
  );
}

export type ChipOption = { value: string; label: string; dot?: string };

type ChipGroupProps = {
  options: ChipOption[];
  /** Nombre del campo: se renderizan <input type="hidden"> para enviar con el form. */
  name?: string;
  multiple?: boolean;
  /** Controlado. */
  value?: string[];
  /** No controlado. */
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  /** En modo simple, permitir deseleccionar. */
  allowEmpty?: boolean;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
};

/** Grupo de chips seleccionables (simple o múltiple) compatible con <form>. */
export function ChipGroup({
  options,
  name,
  multiple = false,
  value,
  defaultValue,
  onChange,
  allowEmpty = true,
  size = "md",
  className,
  ...aria
}: ChipGroupProps) {
  const [internal, setInternal] = useState<string[]>(defaultValue ?? []);
  const current = value ?? internal;

  const toggle = (v: string) => {
    let next: string[];
    if (multiple) {
      next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
    } else {
      next = current[0] === v ? (allowEmpty ? [] : current) : [v];
    }
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <div role="group" aria-label={aria["aria-label"]} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => (
        <Chip key={o.value} dot={o.dot} size={size} selected={current.includes(o.value)} onClick={() => toggle(o.value)}>
          {o.label}
        </Chip>
      ))}
      {name ? current.map((v) => <input key={v} type="hidden" name={name} value={v} />) : null}
    </div>
  );
}
