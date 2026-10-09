import { Clock } from "lucide-react";
import { DecorCircles } from "@/components/ui/decor";
import { cn, formatDate, formatDecimal } from "@/lib/utils";
import { STALE_DAYS, type PainStats } from "./pain-state";

/**
 * Tarjeta azul "Dolor por zona" (zonas activas, EVA máxima y promedio del mapa), como el "Resumen"
 * de daily. Es el dolor registrado por zona en el mapa, distinto de la EVA de cada sesión.
 */
export function PainSummaryCard({
  stats,
  asOf,
  lastUpdate,
  improving,
  resolved,
  stale = 0,
  className,
}: {
  stats: PainStats;
  /** Fecha mostrada si se está viendo el mapa en el pasado. */
  asOf: string | null;
  /** "hace 3 días" */
  lastUpdate: string | null;
  improving: number;
  resolved: number;
  /** Zonas con dolor activo sin actualizar hace más de STALE_DAYS días. */
  stale?: number;
  className?: string;
}) {
  const extra = [
    improving ? `${improving} ${improving === 1 ? "zona mejorando" : "zonas mejorando"}` : null,
    resolved ? `${resolved} ${resolved === 1 ? "resuelta" : "resueltas"}` : null,
  ].filter(Boolean);

  return (
    <section
      aria-label="Dolor por zona (mapa)"
      className={cn("relative overflow-hidden rounded-card bg-accent p-6 text-white sm:p-7", className)}
    >
      <DecorCircles className="text-white/70" variant="c" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgb(255_255_255/0.55)]">
            {asOf ? `Al ${formatDate(asOf, { withYear: false })}` : "Dolor por zona"}
          </span>
          {lastUpdate && !asOf ? <span className="text-[13px] text-white/85">Actualizado {lastUpdate}</span> : null}
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

        <p className="mt-4 text-sm text-white/85">
          {stats.active === 0
            ? "Sin dolor activo registrado."
            : extra.length
              ? extra.join(" · ")
              : "Tocá una zona para actualizar su estado."}
        </p>
        {stale > 0 && !asOf ? (
          <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-white">
            <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
            {stale === 1
              ? `1 zona activa sin actualizar hace más de ${STALE_DAYS} días: revisala en la próxima sesión.`
              : `${stale} zonas activas sin actualizar hace más de ${STALE_DAYS} días: revisalas en la próxima sesión.`}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[13px] text-white/85">{label}</dt>
      <dd className="display tabular mt-1 whitespace-nowrap">
        <span className="text-[40px] font-normal sm:text-[44px]">{value}</span>
        {suffix ? <span className="ml-0.5 text-sm text-white/85">{suffix}</span> : null}
      </dd>
    </div>
  );
}
