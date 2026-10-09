import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardData, WeekDay } from "@/components/dashboard/data";
import { formatDayTitle } from "@/components/dashboard/dates";

function dayHref(basePath: string, iso: string, today: string) {
  return iso === today ? basePath : `${basePath}?dia=${iso}`;
}

function countLabel(d: WeekDay) {
  return d.sessionCount === 0 ? "sin sesiones" : d.sessionCount === 1 ? "1 sesión" : `${d.sessionCount} sesiones`;
}

const DAY_BASE =
  "group relative flex flex-col items-center rounded-[18px] px-1 pt-3 pb-2.5 text-center transition-[transform,box-shadow,background-color] duration-200 sm:rounded-[22px] sm:pt-4 sm:pb-3.5";

/**
 * Tira semanal de 7 días (como la de daily). Cada día hasta hoy es un link
 * server-side (?dia=YYYY-MM-DD) que actualiza la lista "Sesiones del día". Los
 * días futuros no se pueden elegir: las sesiones se registran después de atender.
 */
export function WeekStrip({
  week,
  today,
  basePath = "/inicio",
  className,
}: {
  week: DashboardData["week"];
  today: string;
  /** Ruta base para los links (permite reutilizar el componente en vistas previas). */
  basePath?: string;
  className?: string;
}) {
  const viewingToday = week.days.some((d) => d.isToday && d.isSelected);

  return (
    <section aria-labelledby="week-title" className={cn("min-w-0", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="text-sm text-muted sm:text-[15px]">
            Semana <span className="font-medium text-ink">{week.number}</span>
            {week.isCurrent ? " · esta semana" : null}
          </p>
          <h2 id="week-title" className="display mt-1 text-[28px] font-normal text-ink sm:text-[34px]">
            {week.rangeLabel}
          </h2>
        </div>
        <nav aria-label="Cambiar de semana" className="flex items-center gap-2">
          <ButtonLink
            href={dayHref(basePath, week.prevDay, today)}
            scroll={false}
            variant="secondary"
            size="icon"
            className="size-10 sm:size-11"
            aria-label="Semana anterior"
          >
            <ChevronLeft />
          </ButtonLink>
          {week.canGoNext ? (
            <ButtonLink
              href={dayHref(basePath, week.nextDay, today)}
              scroll={false}
              variant="secondary"
              size="icon"
              className="size-10 sm:size-11"
              aria-label="Semana siguiente"
            >
              <ChevronRight />
            </ButtonLink>
          ) : (
            <Button
              variant="secondary"
              size="icon"
              disabled
              className="size-10 sm:size-11"
              aria-label="Semana siguiente (todavía no llegó)"
            >
              <ChevronRight />
            </Button>
          )}
          <ButtonLink
            href={basePath}
            scroll={false}
            variant={viewingToday ? "soft" : "secondary"}
            aria-current={viewingToday ? "date" : undefined}
            className="h-10 px-5 sm:h-11"
          >
            Hoy
          </ButtonLink>
        </nav>
      </div>

      <ol className="grid grid-cols-7 gap-1.5 sm:gap-3">
        {week.days.map((d, i) => {
          const content = (
            <>
              {d.isToday ? (
                <span aria-hidden className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-brand-500 sm:top-3 sm:right-3" />
              ) : null}
              <span aria-hidden className={cn("text-xs sm:text-[15px]", d.isToday ? "text-white/80" : "text-muted")}>
                {d.label}
              </span>
              <span
                aria-hidden
                className={cn(
                  "display tabular mt-0.5 text-[22px] leading-tight font-normal sm:mt-1 sm:text-[34px]",
                  d.isFuture && "text-muted",
                )}
              >
                {d.dayNumber}
              </span>
              <span
                aria-hidden
                className={cn(
                  "mt-1 flex h-4 items-center gap-1 text-[11px] font-medium sm:mt-1.5 sm:text-[13px]",
                  d.isToday ? "text-white/80" : "text-muted",
                )}
              >
                {d.sessionCount > 0 ? (
                  <>
                    <span className="size-1.5 rounded-full bg-green" />
                    <span className="tabular">{d.sessionCount}</span>
                  </>
                ) : (
                  <span className={cn("size-1 rounded-full", d.isToday ? "bg-white/40" : "bg-line-strong")} />
                )}
              </span>
            </>
          );

          return (
            <li key={d.iso} className="min-w-0 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
              {d.isFuture ? (
                <span className={cn(DAY_BASE, "bg-surface/60 text-ink")}>
                  {content}
                  <span className="sr-only">{formatDayTitle(d.iso)}: todavía no llegó</span>
                </span>
              ) : (
                <Link
                  href={dayHref(basePath, d.iso, today)}
                  scroll={false}
                  aria-current={d.isSelected ? "date" : undefined}
                  className={cn(
                    DAY_BASE,
                    d.isToday
                      ? "bg-ink text-white shadow-float"
                      : "bg-surface text-ink hover:-translate-y-0.5 hover:shadow-soft",
                    d.isSelected && !d.isToday && "shadow-[0_0_0_2px_var(--color-ink)] hover:shadow-[0_0_0_2px_var(--color-ink)]",
                  )}
                >
                  {content}
                  <span className="sr-only">
                    {formatDayTitle(d.iso)}
                    {d.isToday ? " (hoy)" : ""}: {countLabel(d)}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
