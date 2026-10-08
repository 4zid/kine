import { DecorCircles } from "@/components/ui/decor";
import { cn, formatDate, formatDecimal } from "@/lib/utils";
import type { PainStats } from "./pain-state";

/** Tarjeta azul de resumen (zonas activas, EVA máxima y promedio), como el "Resumen" de daily. */
export function PainSummaryCard({
  stats,
  asOf,
  lastUpdate,
  improving,
  resolved,
  className,
}: {
  stats: PainStats;
  /** Fecha mostrada si se está viendo el mapa en el pasado. */
  asOf: string | null;
  /** "hace 3 días" */
  lastUpdate: string | null;
  improving: number;
  resolved: number;
  className?: string;
}) {
  const extra = [
    improving ? `${improving} ${improving === 1 ? "zona mejorando" : "zonas mejorando"}` : null,
    resolved ? `${resolved} ${resolved === 1 ? "resuelta" : "resueltas"}` : null,
  ].filter(Boolean);

  return (
    <section
      aria-label="Resumen del dolor"
      className={cn("relative overflow-hidden rounded-card bg-accent p-6 text-white sm:p-7", className)}
    >
      <DecorCircles className="text-white/70" variant="c" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgb(255_255_255/0.55)]">
            {asOf ? `Al ${formatDate(asOf, { withYear: false })}` : "Resumen"}
          </span>
          {lastUpdate && !asOf ? <span className="text-[13px] text-white/70">Actualizado {lastUpdate}</span> : null}
        </div>

        <dl className="mt-9 grid grid-cols-3 gap-3">
          <Stat label="Zonas activas" value={String(stats.active)} />
          <Stat label="EVA máxima" value={stats.max != null ? String(stats.max) : "—"} suffix={stats.max != null ? "/10" : undefined} />
          <Stat
            label="EVA promedio"
            value={stats.avg != null ? formatDecimal(stats.avg) : "—"}
            suffix={stats.avg != null ? "/10" : undefined}
          />
        </dl>

        <p className="mt-4 text-sm text-white/75">
          {stats.active === 0
            ? "Sin dolor activo registrado."
            : extra.length
              ? extra.join(" · ")
              : "Tocá una zona para actualizar su estado."}
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[13px] text-white/75">{label}</dt>
      <dd className="display tabular mt-1 whitespace-nowrap">
        <span className="text-[40px] font-normal sm:text-[44px]">{value}</span>
        {suffix ? <span className="ml-0.5 text-sm text-white/70">{suffix}</span> : null}
      </dd>
    </div>
  );
}
