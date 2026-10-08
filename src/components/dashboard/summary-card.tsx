import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DecorCircles } from "@/components/ui/decor";
import { cn, formatDecimal } from "@/lib/utils";
import type { DashboardData } from "@/components/dashboard/data";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function Kpi({ label, shortLabel, value, suffix }: { label: string; shortLabel?: string; value: ReactNode; suffix?: string }) {
  return (
    <div className="flex min-w-0 flex-col justify-end">
      <dt className="text-[13px] leading-snug text-white/75 sm:text-[15px]">
        {shortLabel ? (
          <>
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </>
        ) : (
          label
        )}
      </dt>
      <dd className="display tabular mt-2 flex items-baseline text-[42px] leading-none font-normal sm:text-[64px] xl:text-[76px]">
        {value}
        {suffix ? <span className="ml-0.5 text-base font-normal text-white/70 sm:text-xl">{suffix}</span> : null}
      </dd>
    </div>
  );
}

/** Tarjeta azul eléctrico con los números de la semana (como el "Resumen" del informe de daily). */
export function SummaryCard({
  summary,
  week,
  className,
}: {
  summary: DashboardData["summary"];
  week: Pick<DashboardData["week"], "number" | "isCurrent">;
  className?: string;
}) {
  const sessionsText =
    summary.attendedSessions > 0
      ? `${plural(summary.attendedSessions, "sesión", "sesiones")} en ${plural(summary.daysWithSessions, "día", "días")}`
      : "sin sesiones registradas";
  const severeText =
    summary.severeCount > 0
      ? plural(summary.severeCount, "paciente con dolor intenso", "pacientes con dolor intenso")
      : "ningún paciente con dolor intenso";

  return (
    <section
      aria-labelledby="summary-title"
      className={cn(
        "relative isolate flex min-h-[300px] flex-col overflow-hidden rounded-card bg-accent p-6 text-white sm:min-h-[340px] sm:p-8",
        className,
      )}
    >
      <DecorCircles variant="a" className="-z-10 text-white/70" />

      <div className="flex items-start justify-between gap-4">
        <h2
          id="summary-title"
          className="inline-flex h-10 items-center rounded-full px-5 text-[15px] font-medium shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.7)]"
        >
          Resumen
        </h2>
        <Link
          href="/pacientes"
          aria-label="Ver todos los pacientes"
          className="inline-flex size-12 items-center justify-center rounded-full shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.55)] transition-colors hover:bg-white/10 focus-visible:outline-white"
        >
          <ArrowUpRight className="size-5" strokeWidth={1.8} />
        </Link>
      </div>

      <div className="mt-auto pt-10">
        <dl className="grid grid-cols-3 items-end gap-3 sm:gap-6">
          <Kpi label="En tratamiento" value={summary.activePatients} />
          <Kpi
            label={week.isCurrent ? "Sesiones esta semana" : "Sesiones en la semana"}
            shortLabel="Sesiones"
            value={summary.attendedSessions}
          />
          <Kpi
            label="EVA promedio actual"
            shortLabel="EVA promedio"
            value={summary.avgPain != null ? formatDecimal(summary.avgPain) : "—"}
            suffix={summary.avgPain != null ? "/10" : undefined}
          />
        </dl>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/80">
          Semana {week.number} · {sessionsText} · {severeText}
        </p>
      </div>
    </section>
  );
}
