"use client";

import { CalendarDays, MapPin, Pencil, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Badge, PainBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PAIN_FREQUENCY, PAIN_STATUS, PAIN_TYPES } from "@/lib/constants";
import type { ActionState } from "@/lib/types";
import { formatDate, painColor } from "@/lib/utils";
import { asPainStatus, recordDay, relativeDay } from "./pain-state";
import { sessionShortLabel } from "./session-label";
import type { PainRecordItem, SessionOption } from "./types";

const TYPE_LABEL = Object.fromEntries(PAIN_TYPES.map((o) => [o.value, o.label]));
const FREQ_LABEL = Object.fromEntries(PAIN_FREQUENCY.map((o) => [o.value, o.label]));

/** Historial de una zona: mini gráfico de intensidad + lista de registros (editables y borrables). */
export function PainHistory({
  records,
  sessions,
  linkedSessions = [],
  today,
  onDelete,
  onEdit,
}: {
  /** Registros de la zona, del más viejo al más nuevo. */
  records: PainRecordItem[];
  sessions: SessionOption[];
  /** Sesiones vinculadas que no están entre `sessions` (para nombrarlas). */
  linkedSessions?: SessionOption[];
  today: string;
  onDelete: (recordId: string) => Promise<ActionState>;
  /** Si se define, cada registro ofrece "Editar" (corregir errores de carga). */
  onEdit?: (record: PainRecordItem) => void;
}) {
  const sessionById = useMemo(
    () => new Map([...linkedSessions, ...sessions].map((s) => [s.id, s] as const)),
    [sessions, linkedSessions],
  );

  if (records.length === 0) {
    return (
      <div className="rounded-panel bg-surface-2 px-5 py-6 text-center">
        <p className="text-sm font-medium text-ink">Sin historial todavía</p>
        <p className="mt-1 text-[13px] text-muted">Cada registro que guardes queda acá, con su fecha.</p>
      </div>
    );
  }

  const sessionLabel = (id: string | null) => (id ? sessionShortLabel(sessionById.get(id)) : null);

  return (
    <div className="space-y-4">
      <IntensityChart records={records} />
      <ol className="space-y-2.5">
        {records
          .slice()
          .reverse()
          .map((r) => {
            const status = asPainStatus(r.status);
            const day = recordDay(r);
            const details = [
              r.started_on ? { k: "Desde", v: formatDate(r.started_on) } : null,
              r.irradiation ? { k: "Irradiación", v: r.irradiation } : null,
              r.aggravating_factors ? { k: "Agravantes", v: r.aggravating_factors } : null,
              r.relieving_factors ? { k: "Atenuantes", v: r.relieving_factors } : null,
              r.notes ? { k: "Notas", v: r.notes } : null,
            ].filter((d): d is { k: string; v: string } => d !== null);
            const linked = sessionLabel(r.session_id);
            return (
              <li key={r.id} className="rounded-panel bg-surface-2 p-4">
                <div className="flex items-start gap-3">
                  {r.intensity > 0 ? (
                    <PainBadge intensity={r.intensity} size="lg" className="shrink-0" />
                  ) : (
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-success-50 text-xs font-semibold text-success-ink">
                      <span className="sr-only">EVA </span>0
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-ink">
                      {formatDate(day)} <span className="font-normal text-muted">· {relativeDay(day, today)}</span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
                      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: PAIN_STATUS[status].color }} />
                      {PAIN_STATUS[status].label}
                      {r.frequency && FREQ_LABEL[r.frequency] ? <span>· {FREQ_LABEL[r.frequency]}</span> : null}
                      {r.point_x != null ? (
                        <span className="inline-flex items-center gap-0.5">
                          · <MapPin aria-hidden className="size-3" /> Punto exacto
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="-mt-1 -mr-1 flex shrink-0 items-center">
                    {onEdit ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(r)}
                        aria-label={`Editar registro del ${formatDate(day)} (EVA ${r.intensity})`}
                        title="Editar (corregir un error de carga)"
                        className="size-10 text-muted hover:text-ink"
                      >
                        <Pencil />
                      </Button>
                    ) : null}
                    <ConfirmDialog
                      title="¿Eliminar este registro?"
                      description={`Se borra del historial el registro del ${formatDate(day)} (EVA ${r.intensity}). Usalo solo para corregir errores de carga: por custodia legal queda una copia en la auditoría clínica, pero deja de verse en la app.`}
                      confirmLabel="Eliminar"
                      successMessage="Registro eliminado"
                      onConfirm={() => onDelete(r.id)}
                      trigger={(open) => (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={open}
                          aria-label={`Eliminar registro del ${formatDate(day)} (EVA ${r.intensity})`}
                          title="Eliminar"
                          className="size-10 text-muted hover:text-danger"
                        >
                          <Trash2 />
                        </Button>
                      )}
                    />
                  </div>
                </div>
                {r.pain_types.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.pain_types.map((t) => (
                      <Badge key={t} tone="white" className="h-6 text-xs">
                        {TYPE_LABEL[t] ?? t}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {details.length || linked ? (
                  <dl className="mt-3 space-y-1.5 text-[13px]">
                    {details.map((d) => (
                      <div key={d.k} className="flex gap-2">
                        <dt className="w-[84px] shrink-0 text-muted">{d.k}</dt>
                        <dd className="min-w-0 flex-1 break-words whitespace-pre-line text-ink-2">{d.v}</dd>
                      </div>
                    ))}
                    {linked ? (
                      <div className="flex gap-2">
                        <dt className="w-[84px] shrink-0 text-muted">Sesión</dt>
                        <dd className="inline-flex items-center gap-1 text-ink-2">
                          <CalendarDays aria-hidden className="size-3.5 text-muted" />
                          {linked}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </li>
            );
          })}
      </ol>
    </div>
  );
}

const W = 320;
const H = 116;
const PAD = { l: 24, r: 10, t: 12, b: 22 };

/** Mini gráfico de línea de la intensidad (EVA) en el tiempo, con tooltip por punto. */
function IntensityChart({ records }: { records: PainRecordItem[] }) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [active, setActive] = useState<number | null>(null);
  const times = records.map((r) => new Date(r.recorded_at).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const x = (i: number) => {
    if (records.length === 1) return PAD.l + innerW / 2;
    if (t1 === t0) return PAD.l + (innerW * i) / (records.length - 1);
    // Proporcional al tiempo, con una separación mínima para que los puntos no se pisen.
    const prop = (times[i] - t0) / (t1 - t0);
    const even = i / (records.length - 1);
    return PAD.l + innerW * (prop * 0.75 + even * 0.25);
  };
  const y = (v: number) => PAD.t + innerH * (1 - v / 10);
  const pts = records.map((r, i) => [x(i), y(r.intensity)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  const area = `${line}L${pts[pts.length - 1][0].toFixed(1)} ${y(0)}L${pts[0][0].toFixed(1)} ${y(0)}Z`;
  const first = records[0];
  const last = records[records.length - 1];
  const activeRecord = active != null ? records[active] : null;

  return (
    <figure className="rounded-panel bg-surface-2 p-4">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-ink-2">Intensidad en el tiempo</span>
        <span className="text-xs text-muted">
          {records.length} {records.length === 1 ? "registro" : "registros"}
        </span>
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={`Evolución de la intensidad: ${records.map((r) => `${formatDate(recordDay(r), { withYear: false })} EVA ${r.intensity}`).join(", ")}`}>
          <defs>
            <linearGradient id={`${gid}-area`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#111114" stopOpacity="0.08" />
              <stop offset="1" stopColor="#111114" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 5, 10].map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#d2d2da" strokeWidth={1} strokeDasharray={v === 0 ? undefined : "2 4"} />
              <text x={PAD.l - 8} y={y(v) + 3.5} textAnchor="end" className="fill-muted text-[10px]">
                {v}
              </text>
            </g>
          ))}
          {records.length > 1 ? (
            <>
              <path d={area} fill={`url(#${gid}-area)`} />
              <path d={line} fill="none" stroke="#111114" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </>
          ) : null}
          {pts.map((p, i) => (
            <g key={records[i].id}>
              <circle cx={p[0]} cy={p[1]} r={active === i ? 6 : 4.5} fill={painColor(records[i].intensity)} stroke="#fff" strokeWidth={2} />
              <circle
                cx={p[0]}
                cy={p[1]}
                r={13}
                fill="transparent"
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                onClick={() => setActive(i)}
              />
            </g>
          ))}
          <text x={PAD.l} y={H - 4} className="fill-muted text-[10px]">
            {formatDate(recordDay(first), { withYear: false })}
          </text>
          {records.length > 1 ? (
            <text x={W - PAD.r} y={H - 4} textAnchor="end" className="fill-muted text-[10px]">
              {formatDate(recordDay(last), { withYear: false })}
            </text>
          ) : null}
        </svg>
        {activeRecord && active != null ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-full bg-ink px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white shadow-float"
            style={{ left: `${(pts[active][0] / W) * 100}%`, top: `${(pts[active][1] / H) * 100}%` }}
          >
            {formatDate(recordDay(activeRecord), { withYear: false })} · EVA {activeRecord.intensity}
          </div>
        ) : null}
      </div>
    </figure>
  );
}
