"use client";

import { ArrowRight, ChevronDown, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { excerpt, type ClinicalAlert } from "@/components/patients/format";
import { cn } from "@/lib/utils";

/** Largo del detalle visible en mobile con la franja contraída. */
const SHORT_DETAIL = 32;
const LONG_DETAIL = 90;

/**
 * Franja de alertas clínicas (contraindicaciones): antecedentes marcados como alerta,
 * alergias y banderas rojas. Crítica para la seguridad (p. ej. no usar electroterapia con marcapasos):
 * las etiquetas se ven siempre. En mobile los detalles largos se acortan y se despliegan con
 * "Ver detalle", para que la franja no ocupe toda la primera pantalla.
 */
export function ClinicalAlerts({
  alerts,
  historyHref,
  className,
}: {
  alerts: ClinicalAlert[];
  historyHref: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  if (alerts.length === 0) return null;

  const collapsible = alerts.some((a) => (a.detail?.replace(/\s+/g, " ").trim().length ?? 0) > SHORT_DETAIL);

  return (
    <section
      aria-label="Alertas clínicas"
      className={cn(
        "flex flex-col gap-2.5 rounded-panel bg-warning-50 px-4 py-3 shadow-[inset_0_0_0_1px_rgb(183_121_31/0.18)] sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-3.5 print:hidden",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-px inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-warning text-white">
          <TriangleAlert className="size-4" aria-hidden />
        </span>
        <p id={detailsId} className="min-w-0 pt-0.5 text-[15px] leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">Alertas clínicas</span>
          {alerts.map((a) => {
            const short = a.detail ? excerpt(a.detail, SHORT_DETAIL) : null;
            const long = a.detail ? excerpt(a.detail, LONG_DETAIL) : null;
            return (
              <span key={a.key}>
                {" "}
                <span aria-hidden className="px-1 text-warning">
                  ·
                </span>{" "}
                <span className="font-medium text-ink" title={a.detail}>
                  {a.label}
                </span>
                {a.tone === "precaution" ? <span className="text-ink-2"> (precaución)</span> : null}
                {long ? (
                  <>
                    {/* Mobile: corto salvo que se despliegue. Desde sm: siempre el largo. */}
                    <span className={cn("text-ink-2 sm:hidden", expanded && "hidden")}>: {short}</span>
                    <span className={cn("text-ink-2 sm:inline", expanded ? "inline" : "hidden")}>: {long}</span>
                  </>
                ) : null}
              </span>
            );
          })}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={detailsId}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/70 px-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-white hover:text-ink sm:hidden"
          >
            {expanded ? "Ver menos" : "Ver detalle"}
            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden />
          </button>
        ) : null}
        <Link
          href={historyHref}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/70 px-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-white hover:text-ink sm:px-3.5"
        >
          Ver historia clínica
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
