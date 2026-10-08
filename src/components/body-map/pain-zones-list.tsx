"use client";

import { ChevronDown, Minus, MousePointerClick, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { PainBadge } from "@/components/ui/badge";
import { getRegion, REGION_GROUPS } from "@/lib/body-regions";
import { PAIN_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { asPainStatus, isActivePain, recordDay, relativeDay, trendOf, type RegionState } from "./pain-state";

/** Lista "Zonas con dolor": ordenada por intensidad, con tendencia y fecha relativa. */
export function PainZonesList({
  states,
  selectedId,
  onSelect,
  today,
  className,
}: {
  states: RegionState[];
  selectedId: string | null;
  onSelect: (regionId: string) => void;
  today: string;
  className?: string;
}) {
  const [showResolved, setShowResolved] = useState(false);
  const active = states
    .filter((s) => isActivePain(s.latest))
    .sort(
      (a, b) =>
        b.latest.intensity - a.latest.intensity ||
        new Date(b.latest.recorded_at).getTime() - new Date(a.latest.recorded_at).getTime(),
    );
  const resolved = states
    .filter((s) => !isActivePain(s.latest))
    .sort((a, b) => new Date(b.latest.recorded_at).getTime() - new Date(a.latest.recorded_at).getTime());

  return (
    <section aria-labelledby="zones-title" className={cn("rounded-card bg-surface p-5 sm:p-6", className)}>
      <div className="mb-3 flex items-start justify-between gap-3 px-1">
        <div>
          <h2 id="zones-title" className="display text-[22px] font-medium text-ink">
            Zonas con dolor
          </h2>
          <p className="mt-1 text-sm text-muted">
            {active.length ? "Ordenadas por intensidad. Tocá una para verla." : "Todavía no hay dolor activo."}
          </p>
        </div>
        {active.length ? (
          <span className="tabular inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-surface-2 px-3 text-sm font-semibold text-ink">
            {active.length}
          </span>
        ) : null}
      </div>

      {active.length === 0 ? (
        <div className="flex items-center gap-4 rounded-panel bg-surface-2 p-5">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-2">
            <MousePointerClick className="size-5" aria-hidden />
          </span>
          <p className="text-sm text-muted">
            Tocá una zona del cuerpo (o buscala por nombre) para registrar el primer dolor del paciente.
          </p>
        </div>
      ) : (
        <ul className="-mx-1 space-y-0.5">
          {active.map((s) => (
            <ZoneRow key={s.region} state={s} today={today} selected={selectedId === s.region} onSelect={onSelect} />
          ))}
        </ul>
      )}

      {resolved.length ? (
        <div className="mt-3 border-t border-line pt-3">
          <button
            type="button"
            aria-expanded={showResolved}
            onClick={() => setShowResolved((v) => !v)}
            className="flex h-10 w-full items-center justify-between rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: PAIN_STATUS.resolved.color }} />
              Resueltas · {resolved.length}
            </span>
            <ChevronDown aria-hidden className={cn("size-4 transition-transform", showResolved && "rotate-180")} />
          </button>
          {showResolved ? (
            <ul className="-mx-1 mt-1 space-y-0.5 animate-fade-in">
              {resolved.map((s) => (
                <ZoneRow key={s.region} state={s} today={today} selected={selectedId === s.region} onSelect={onSelect} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ZoneRow({
  state,
  today,
  selected,
  onSelect,
}: {
  state: RegionState;
  today: string;
  selected: boolean;
  onSelect: (regionId: string) => void;
}) {
  const region = getRegion(state.region);
  const r = state.latest;
  const status = asPainStatus(r.status);
  const resolved = !isActivePain(r);
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(state.region)}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2",
          selected && "bg-surface-2 shadow-inset",
        )}
      >
        {resolved ? (
          <span
            aria-hidden
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-success-50 text-xs font-semibold text-success"
          >
            0
          </span>
        ) : (
          <PainBadge intensity={r.intensity} size="lg" className="shrink-0" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-ink">{region?.label ?? state.region}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: PAIN_STATUS[status].color }} />
            <span className="truncate">
              {`${PAIN_STATUS[status].label} · ${relativeDay(recordDay(r), today)}`}
            </span>
          </span>
        </span>
        {!resolved ? <Trend state={state} /> : null}
        <span className="sr-only">{region ? REGION_GROUPS[region.group] : ""}</span>
      </button>
    </li>
  );
}

function Trend({ state }: { state: RegionState }) {
  const t = trendOf(state);
  if (t === "new") {
    return <span className="shrink-0 rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-medium text-accent-700">Nuevo</span>;
  }
  const diff = state.latest.intensity - (state.previous?.intensity ?? state.latest.intensity);
  const label = t === "down" ? `Bajó ${-diff}` : t === "up" ? `Subió ${diff}` : "Sin cambios";
  return (
    <span
      title={label}
      className={cn(
        "tabular inline-flex shrink-0 items-center gap-0.5 text-[13px] font-medium",
        t === "down" && "text-success",
        t === "up" && "text-danger",
        t === "same" && "text-subtle",
      )}
    >
      <span className="sr-only">{label}</span>
      {t === "down" ? <TrendingDown aria-hidden className="size-4" /> : null}
      {t === "up" ? <TrendingUp aria-hidden className="size-4" /> : null}
      {t === "same" ? <Minus aria-hidden className="size-4" /> : null}
      {t !== "same" ? <span aria-hidden>{Math.abs(diff)}</span> : null}
    </span>
  );
}
