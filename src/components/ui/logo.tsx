import { cn } from "@/lib/utils";

export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-9 shrink-0", className)}>
      <circle cx="16" cy="16" r="16" fill={inverted ? "#fff" : "var(--color-brand)"} />
      <g fill={inverted ? "var(--color-brand)" : "#fff"}>
        <rect x="12" y="8" width="9" height="3.8" rx="1.9" />
        <rect x="10" y="14.1" width="12" height="3.8" rx="1.9" />
        <rect x="11.5" y="20.2" width="9" height="3.8" rx="1.9" />
      </g>
    </svg>
  );
}

/** Logo "kine" (marca + wordmark). */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark inverted={inverted} />
      <span className={cn("display text-[22px] font-medium", inverted ? "text-white" : "text-ink")}>kine</span>
    </span>
  );
}
