import { cn, PAIN_COLORS } from "@/lib/utils";
import { FIGURE } from "./figure-style";

/** Anclas verbales de la escala (las mismas en todos los formularios de dolor). */
export const PAIN_SCALE_ANCHORS = "0 = sin dolor · 10 = el peor dolor imaginable";

/**
 * Escala EVA 0–10 (0 = sin dolor, gris como la figura; 1–10 con los colores de dolor) con
 * "Sin dolor · Leve · Moderado · Intenso". Sin hooks: sirve en servidor, cliente e impresión.
 */
export function PainLegend({ className, title = "EVA (0–10)" }: { className?: string; title?: string | null }) {
  const steps = PAIN_COLORS.map((c, i) => (i === 0 ? FIGURE.neutral : c)); // 0..10
  return (
    <div
      className={cn("min-w-0", className)}
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      role="img"
      aria-label="Escala EVA de 0 a 10: 0 sin dolor; leve de 1 a 3; moderado de 4 a 6; intenso de 7 a 10, donde 10 es el peor dolor imaginable"
    >
      {title ? <p className="mb-2.5 text-[13px] font-medium text-ink-2">{title}</p> : null}
      <div className="flex gap-[3px]">
        {steps.map((c, i) => (
          <span key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span
              className={cn("h-2 w-full rounded-full", i === 0 && "shadow-[inset_0_0_0_1px_var(--color-line-strong)]")}
              style={{ backgroundColor: c }}
            />
            <span className="tabular text-[10px] leading-none text-muted">{i}</span>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px] text-[11px] text-muted">
        <span aria-hidden className="min-w-0" style={{ flex: 1 }} />
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
      <p className="mt-1.5 text-[11px] text-muted">{PAIN_SCALE_ANCHORS}</p>
    </div>
  );
}
