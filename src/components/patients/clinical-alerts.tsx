import { ArrowRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { excerpt, type ClinicalAlert } from "@/components/patients/format";
import { cn } from "@/lib/utils";

/**
 * Franja de alertas clínicas (contraindicaciones): antecedentes marcados como alerta,
 * alergias y banderas rojas. Crítica para la seguridad (p. ej. no usar electroterapia con marcapasos).
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
  if (alerts.length === 0) return null;

  return (
    <section
      aria-label="Alertas clínicas"
      className={cn(
        "flex flex-col gap-3 rounded-panel bg-warning-50 px-4 py-3.5 shadow-[inset_0_0_0_1px_rgb(183_121_31/0.18)] sm:flex-row sm:items-center sm:gap-4 sm:px-5 print:hidden",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-px inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-warning text-white">
          <TriangleAlert className="size-4" aria-hidden />
        </span>
        <p className="min-w-0 pt-0.5 text-[15px] leading-relaxed text-ink-2">
          <span className="font-semibold text-warning">Alertas clínicas</span>
          {alerts.map((a) => {
            const detail = a.detail ? excerpt(a.detail, 90) : null;
            return (
              <span key={a.key}>
                {" "}
                <span aria-hidden className="px-1 text-warning/50">
                  ·
                </span>{" "}
                <span className="font-medium text-ink" title={a.detail}>
                  {a.label}
                </span>
                {detail ? <span className="text-ink-2">: {detail}</span> : null}
              </span>
            );
          })}
        </p>
      </div>
      <Link
        href={historyHref}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-full bg-white/70 px-3.5 text-[13px] font-medium text-warning transition-colors hover:bg-white sm:self-auto"
      >
        Ver historia clínica
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </section>
  );
}
