import type { ComponentProps } from "react";
import { cn, painColor, painTextColor } from "@/lib/utils";

/** Píldora pequeña con punto de color opcional (como "Placer 8"). */
export function Badge({
  dot,
  tone = "soft",
  className,
  children,
  ...props
}: ComponentProps<"span"> & { dot?: string; tone?: "soft" | "white" | "dark" | "outline" }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium whitespace-nowrap",
        tone === "soft" && "bg-surface-2 text-ink-2",
        tone === "white" && "bg-surface text-ink-2 shadow-inset",
        tone === "dark" && "bg-ink text-white",
        tone === "outline" && "text-ink-2 shadow-inset",
        className,
      )}
      {...props}
    >
      {dot ? <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dot }} /> : null}
      {children}
    </span>
  );
}

/** Indicador de intensidad de dolor (EVA) coloreado. */
export function PainBadge({
  intensity,
  size = "md",
  className,
  showLabel = false,
}: {
  intensity: number | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}) {
  if (intensity == null) {
    return (
      <span className={cn("inline-flex items-center rounded-full bg-surface-2 px-2.5 text-[13px] text-muted", size === "sm" ? "h-6" : "h-7", className)}>
        Sin registro
      </span>
    );
  }
  return (
    <span
      className={cn(
        "tabular inline-flex items-center justify-center gap-1 rounded-full font-semibold",
        size === "sm" && "h-6 min-w-6 px-2 text-xs",
        size === "md" && "h-7 min-w-7 px-2.5 text-[13px]",
        size === "lg" && "h-9 min-w-9 px-3 text-sm",
        className,
      )}
      style={{ backgroundColor: painColor(intensity), color: painTextColor(intensity) }}
      title={`Dolor ${intensity}/10`}
    >
      {showLabel ? "EVA " : null}
      {intensity}
      {showLabel ? <span className="font-normal opacity-75">/10</span> : null}
    </span>
  );
}
