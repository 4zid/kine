import { cn, PAIN_COLORS } from "@/lib/utils";

/**
 * Escala EVA 1–10 (segmentos con los colores de dolor) con "Leve · Moderado · Intenso".
 * Sin hooks: sirve en servidor, cliente e impresión.
 */
export function PainLegend({ className, title = "Escala EVA" }: { className?: string; title?: string | null }) {
  const steps = PAIN_COLORS.slice(1); // 1..10
  return (
    <div
      className={cn("min-w-0", className)}
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      role="img"
      aria-label="Escala de dolor EVA del 1 al 10: leve de 1 a 3, moderado de 4 a 6, intenso de 7 a 10"
    >
      {title ? <p className="mb-2.5 text-[13px] font-medium text-ink-2">{title}</p> : null}
      <div className="flex gap-[3px]">
        {steps.map((c, i) => (
          <span key={c} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="h-2 w-full rounded-full" style={{ backgroundColor: c }} />
            <span className="tabular text-[10px] leading-none text-subtle">{i + 1}</span>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px] text-[11px] text-muted">
        <span className="border-t border-line pt-1 text-center" style={{ flex: 3 }}>
          Leve
        </span>
        <span className="border-t border-line pt-1 text-center" style={{ flex: 3 }}>
          Moderado
        </span>
        <span className="border-t border-line pt-1 text-center" style={{ flex: 4 }}>
          Intenso
        </span>
      </div>
    </div>
  );
}
