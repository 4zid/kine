import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { DecorCircles } from "@/components/ui/decor";
import { cn } from "@/lib/utils";
import { formatScore, improvementText, type SessionStats } from "@/components/sessions/session-utils";

const MAX_SEGMENTS = 24;

/** Barra segmentada (como la de "Constancia"): un segmento por sesión prescripta. */
export function SegmentedProgress({
  done,
  total,
  tone = "light",
  className,
  label,
}: {
  done: number;
  total: number;
  tone?: "light" | "dark";
  className?: string;
  label: string;
}) {
  const segments = Math.min(total, MAX_SEGMENTS);
  const filled = total > 0 ? Math.min(segments, Math.round((Math.min(done, total) / total) * segments)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(done, total)}
      className={cn("flex gap-1", className)}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 min-w-0 flex-1 rounded-full transition-colors",
            tone === "light" ? (i < filled ? "bg-white" : "bg-white/22") : i < filled ? "bg-accent" : "bg-surface-3",
          )}
        />
      ))}
    </div>
  );
}

/** Tarjeta resumen azul eléctrico (como "Resumen" de daily) con los números del tratamiento. */
export function SessionsSummaryCard({
  stats,
  reportHref,
  className,
}: {
  stats: SessionStats;
  reportHref?: string;
  className?: string;
}) {
  const improvement = improvementText(stats.improvementPct);
  const footer = [
    improvement ? `${improvement} desde la primera sesión` : null,
    stats.attendanceRate != null ? `Asistencia ${stats.attendanceRate} %` : null,
  ].filter(Boolean);

  return (
    <section
      aria-label="Resumen del tratamiento"
      className={cn(
        "relative flex flex-col overflow-hidden rounded-card bg-accent p-6 text-white sm:p-7 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]",
        className,
      )}
    >
      <DecorCircles className="text-white" variant="a" />
      <div className="relative flex items-start justify-between gap-4">
        <span className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium shadow-[inset_0_0_0_1px_rgb(255_255_255/0.6)]">
          Resumen
        </span>
        {reportHref ? (
          <Link
            href={reportHref}
            aria-label="Ver informe del tratamiento"
            className="inline-flex size-12 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.55)] transition-colors hover:bg-white/10 focus-visible:outline-white print:hidden"
          >
            <ArrowUpRight className="size-5" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="relative mt-8">
        <p className="text-sm text-white/75">Sesiones realizadas</p>
        <p className="display mt-1 flex items-baseline gap-2">
          <span className="text-[56px] leading-none font-normal">{stats.attended}</span>
          {stats.prescribed ? <span className="text-xl text-white/70">de {stats.prescribed}</span> : null}
        </p>
        {stats.prescribed ? (
          <>
            <SegmentedProgress
              done={stats.attended}
              total={stats.prescribed}
              className="mt-4"
              label={`${stats.attended} de ${stats.prescribed} sesiones prescriptas`}
            />
            {stats.attended > stats.prescribed ? (
              <p className="mt-2 text-[13px] text-white/70">
                {stats.attended - stats.prescribed} por encima de lo prescripto
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-[13px] text-white/70">Sin cantidad prescripta en la historia clínica</p>
        )}
      </div>

      <div className="relative mt-auto grid grid-cols-2 gap-4 pt-8">
        <div>
          <p className="flex items-center gap-2 text-sm text-white/75">
            <span aria-hidden className="size-2 rounded-full bg-orange ring-2 ring-white/30" />
            EVA prom. inicio
          </p>
          <p className="display mt-1">
            <span className="text-[44px] leading-none font-normal sm:text-[48px]">{formatScore(stats.avgBefore)}</span>
            <span className="text-base text-white/70">/10</span>
          </p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-sm text-white/75">
            <span aria-hidden className="size-2 rounded-full bg-white ring-2 ring-white/30" />
            EVA prom. final
          </p>
          <p className="display mt-1">
            <span className="text-[44px] leading-none font-normal sm:text-[48px]">{formatScore(stats.avgAfter)}</span>
            <span className="text-base text-white/70">/10</span>
          </p>
        </div>
      </div>

      {footer.length > 0 ? (
        <p className="relative mt-4 text-[15px] leading-snug text-white/85">{footer.join(" · ")}</p>
      ) : null}
    </section>
  );
}
