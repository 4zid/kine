import { cn } from "@/lib/utils";

/**
 * Indicador de pasos con segmentos (el activo más largo y negro, como en daily).
 * Si se pasa `onSelect`, los pasos ya completados se pueden tocar para volver.
 */
export function StepSegments({
  total,
  current,
  labels,
  onSelect,
  className,
}: {
  total: number;
  /** Paso actual (base 1). */
  current: number;
  labels?: string[];
  onSelect?: (step: number) => void;
  className?: string;
}) {
  return (
    <ol className={cn("flex items-center gap-1.5", className)} aria-label="Progreso">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const active = step === current;
        const done = step < current;
        const bar = (
          <span
            className={cn(
              "block h-1.5 rounded-full transition-[width,background-color] duration-500 ease-out",
              active ? "w-12 bg-ink" : "w-7",
              done && "bg-muted/60",
              !active && !done && "bg-line-strong",
            )}
          />
        );
        const label = labels?.[i] ? `Paso ${step}: ${labels[i]}` : `Paso ${step}`;
        return (
          <li key={step} aria-current={active ? "step" : undefined}>
            {onSelect && done ? (
              <button
                type="button"
                onClick={() => onSelect(step)}
                aria-label={`Volver al ${label.toLowerCase()}`}
                className="group flex h-10 items-center rounded-full [&>span]:group-hover:bg-muted"
              >
                {bar}
              </button>
            ) : (
              <span className="flex h-10 items-center" aria-label={label} role="img">
                {bar}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
