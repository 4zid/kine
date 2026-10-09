import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/components/dashboard/data";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** % de asistencia de la semana + barras por día (como "Constancia" de daily). Solo cuenta días hasta hoy. */
export function AttendanceCard({
  attendance,
  days,
  className,
}: {
  attendance: DashboardData["attendance"];
  days: DashboardData["week"]["days"];
  className?: string;
}) {
  const total = attendance.attended + attendance.absent;
  const daysAttended = days.filter((d) => d.attended).length;

  const caption =
    total === 0 && attendance.cancelled === 0
      ? "Todavía no hay sesiones registradas en esta semana."
      : [
          `${plural(daysAttended, "día", "días")} con pacientes atendidos`,
          attendance.absent > 0 ? plural(attendance.absent, "ausencia", "ausencias") : "sin ausencias",
          attendance.cancelled > 0
            ? `${plural(attendance.cancelled, "cancelación", "cancelaciones")} (no cuentan)`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <section
      aria-labelledby="attendance-title"
      className={cn("flex min-w-0 flex-col rounded-card bg-surface p-6 sm:p-8", className)}
    >
      <h2 id="attendance-title" className="display text-[26px] font-medium text-ink">
        Asistencia
      </h2>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <p className="display tabular text-[72px] leading-[0.9] font-normal text-ink sm:text-[88px]">
          {attendance.rate != null ? (
            `${attendance.rate} %`
          ) : (
            <>
              <span aria-hidden className="text-line-strong">
                –&#8239;%
              </span>
              <span className="sr-only">Sin datos</span>
            </>
          )}
        </p>
        <Badge className="mb-1 h-10 px-4 text-sm">
          {total > 0 ? `${attendance.attended} de ${plural(total, "sesión", "sesiones")}` : "Sin sesiones"}
        </Badge>
      </div>

      <ol className="mt-7 grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Días con pacientes atendidos">
        {days.map((d) => (
          <li key={d.iso} className="flex min-w-0 flex-col gap-2.5">
            <span
              aria-hidden
              className={cn(
                "h-2.5 w-full rounded-full transition-colors",
                d.attended ? "bg-accent" : d.isFuture ? "bg-surface-2" : "bg-surface-3",
              )}
            />
            <span
              className={cn(
                "text-[13px] sm:text-[15px]",
                d.isToday ? "font-medium text-ink" : "text-muted",
              )}
            >
              {d.label}
              <span className="sr-only">
                : {d.isFuture ? "todavía no llegó" : d.attended ? "con pacientes atendidos" : "sin pacientes atendidos"}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-auto pt-6 text-sm leading-relaxed text-muted">{caption}</p>
    </section>
  );
}
