"use client";

import { ArrowRight, ChevronDown, Clock, Dumbbell, NotebookPen, TrendingDown, TrendingUp } from "lucide-react";
import { useId, useState } from "react";
import { Badge, PainBadge } from "@/components/ui/badge";
import { ATTENDANCE } from "@/lib/constants";
import type { Attendance, TreatmentSession } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DeleteSessionDialog } from "@/components/sessions/delete-session";
import { SessionMenu } from "@/components/sessions/session-menu";
import {
  dayParts,
  durationLabel,
  endTime,
  longDate,
  shortDate,
  techniqueColor,
  techniqueLabel,
  toHHMM,
} from "@/components/sessions/session-utils";

export type SessionCardData = Pick<
  TreatmentSession,
  | "id"
  | "session_date"
  | "start_time"
  | "duration_minutes"
  | "attendance"
  | "techniques"
  | "pain_before"
  | "pain_after"
  | "subjective"
  | "objective"
  | "assessment"
  | "plan"
  | "home_exercises"
  | "notes"
>;

const SOAP = [
  { key: "subjective", letter: "S", label: "Subjetivo" },
  { key: "objective", letter: "O", label: "Objetivo" },
  { key: "assessment", letter: "A", label: "Análisis" },
  { key: "plan", letter: "P", label: "Plan" },
] as const;

const EXCERPT_LIMIT = 150;
const VISIBLE_TECHNIQUES = 4;

/** Tarjeta de día (como las de la semana en daily): día de la semana + número grande. */
export function DayTile({
  date,
  highlight = false,
  muted = false,
  compact = false,
  className,
}: {
  date: string;
  highlight?: boolean;
  muted?: boolean;
  /** Versión chica (mobile). */
  compact?: boolean;
  className?: string;
}) {
  const p = dayParts(date);
  return (
    <div
      aria-hidden
      className={cn(
        "relative flex shrink-0 flex-col items-center justify-center",
        compact ? "h-[60px] w-[52px] rounded-2xl" : "h-[92px] w-[76px] rounded-[20px]",
        highlight ? "bg-ink text-white" : "bg-surface-2 text-ink",
        muted && "text-muted",
        className,
      )}
    >
      {highlight ? (
        <span
          aria-hidden
          className={cn("absolute size-1.5 rounded-full bg-green", compact ? "top-2 right-2" : "top-2.5 right-2.5")}
        />
      ) : null}
      <span className={cn(compact ? "text-[11px]" : "text-[13px]", highlight ? "text-white/70" : "text-muted")}>
        {p.weekday}
      </span>
      <span className={cn("display tabular leading-none font-normal", compact ? "text-[24px]" : "text-[34px]")}>
        {p.day}
      </span>
      {compact ? null : (
        <span className={cn("mt-1 text-[11px]", highlight ? "text-white/60" : "text-subtle")}>{p.month}</span>
      )}
    </div>
  );
}

/** Dolor antes → después con la variación. */
export function PainChange({
  before,
  after,
  className,
}: {
  before: number | null;
  after: number | null;
  className?: string;
}) {
  if (before == null && after == null) return null;
  const delta = before != null && after != null ? after - before : null;
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="sr-only">
        Dolor al inicio {before ?? "sin registro"}, al final {after ?? "sin registro"}.
      </span>
      <span aria-hidden className="inline-flex items-center gap-1.5">
        <PainBadge intensity={before} size="sm" className={before == null ? "px-2 text-xs" : undefined} />
        <ArrowRight className="size-3.5 text-subtle" />
        <PainBadge intensity={after} size="sm" className={after == null ? "px-2 text-xs" : undefined} />
      </span>
      {delta != null && delta !== 0 ? (
        <span
          className={cn(
            "tabular ml-0.5 inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold",
            delta < 0 ? "bg-success-50 text-success" : "bg-danger-50 text-danger",
          )}
        >
          {delta < 0 ? (
            <TrendingDown className="size-3.5" aria-hidden />
          ) : (
            <TrendingUp className="size-3.5" aria-hidden />
          )}
          {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
          <span className="sr-only">{delta < 0 ? "puntos de mejoría" : "puntos de empeoramiento"}</span>
        </span>
      ) : delta === 0 ? (
        <span className="ml-0.5 inline-flex h-6 items-center rounded-full bg-surface-2 px-2 text-xs font-medium text-muted">
          =
        </span>
      ) : null}
    </div>
  );
}

function statusOf(session: SessionCardData, upcoming: boolean): { label: string; color: string } {
  if (upcoming && session.attendance !== "cancelled") return { label: "Programada", color: "#2F6FE0" };
  return ATTENDANCE[(session.attendance as Attendance) ?? "attended"] ?? ATTENDANCE.attended;
}

/** Tarjeta de una sesión en la evolución. */
export function SessionCard({
  patientId,
  session,
  number,
  isToday = false,
  upcoming = false,
}: {
  patientId: string;
  session: SessionCardData;
  /** Número de sesión realizada (1, 2, 3…), si corresponde. */
  number?: number;
  isToday?: boolean;
  upcoming?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const attended = session.attendance === "attended";
  const clinical = attended && !upcoming;
  const status = statusOf(session, upcoming);
  const time = toHHMM(session.start_time);
  const end = time ? endTime(time, session.duration_minutes) : null;
  const techniques = session.techniques ?? [];

  const soap = SOAP.map((s) => ({ ...s, text: session[s.key]?.trim() ?? "" })).filter((s) => s.text);
  const extras = [
    {
      key: "home_exercises",
      label: "Ejercicios para casa",
      icon: <Dumbbell aria-hidden />,
      text: session.home_exercises?.trim() ?? "",
    },
    { key: "notes", label: "Notas", icon: <NotebookPen aria-hidden />, text: session.notes?.trim() ?? "" },
  ].filter((e) => e.text && (clinical || e.key === "notes"));

  const isLong = (t: string) => t.length > EXCERPT_LIMIT || t.includes("\n");
  const hiddenTechniques = Math.max(0, techniques.length - VISIBLE_TECHNIQUES);
  const canExpand =
    (clinical && (soap.some((s) => isLong(s.text)) || extras.length > 0 || hiddenTechniques > 0)) ||
    (!clinical && extras.some((e) => isLong(e.text)));

  const dateLabel = longDate(session.session_date).toLowerCase();
  const editHref = `/pacientes/${patientId}/sesiones/${session.id}/editar`;

  return (
    <article
      aria-label={`Sesión del ${dateLabel}`}
      className={cn(
        "group/card rounded-card bg-surface p-4 transition-shadow hover:shadow-soft sm:flex sm:gap-5 sm:p-5",
        !clinical && !upcoming && "bg-surface/70",
      )}
    >
      <DayTile
        date={session.session_date}
        highlight={isToday}
        muted={!clinical && !upcoming && !isToday}
        className="hidden sm:flex"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <DayTile
            compact
            date={session.session_date}
            highlight={isToday}
            muted={!clinical && !upcoming && !isToday}
            className="mr-1 sm:hidden"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {time ? (
                <p className="display tabular text-[24px] leading-none font-medium text-ink sm:text-[26px]">
                  {time}
                  {end ? <span className="text-[17px] font-normal text-subtle sm:text-lg"> – {end}</span> : null}
                </p>
              ) : (
                <p className="inline-flex items-center gap-1.5 text-[15px] text-muted">
                  <Clock className="size-4" aria-hidden />
                  Sin horario
                </p>
              )}
              <Badge dot={status.color} tone="white" className="h-6 px-2 text-xs">
                {status.label}
              </Badge>
            </div>
            <p className="mt-1.5 text-[13px] text-muted">
              {number ? <span className="font-medium text-ink-2">Sesión {number}</span> : null}
              {number ? " · " : null}
              {session.duration_minutes ? durationLabel(session.duration_minutes) : "Duración sin cargar"}
              <span className="hidden sm:inline"> · {shortDate(session.session_date, true)}</span>
            </p>
          </div>

          <div className="-mt-1 -mr-1 flex shrink-0 items-center gap-2 sm:-mr-2">
            {clinical ? (
              <PainChange before={session.pain_before} after={session.pain_after} className="hidden sm:inline-flex" />
            ) : null}
            <DeleteSessionDialog
              patientId={patientId}
              sessionId={session.id}
              dateLabel={dateLabel}
              trigger={(open) => (
                <SessionMenu
                  editHref={editHref}
                  onDelete={open}
                  label={`sesión del ${shortDate(session.session_date)}`}
                />
              )}
            />
          </div>
        </div>

        {clinical ? (
          <PainChange before={session.pain_before} after={session.pain_after} className="mt-3 sm:hidden" />
        ) : null}

        {clinical && techniques.length > 0 ? (
          <ul className="mt-3.5 flex flex-wrap gap-1.5" aria-label="Técnicas">
            {(expanded ? techniques : techniques.slice(0, VISIBLE_TECHNIQUES)).map((t) => (
              <li key={t}>
                <Badge dot={techniqueColor(t)} className="h-7 text-[13px]">
                  {techniqueLabel(t)}
                </Badge>
              </li>
            ))}
            {!expanded && hiddenTechniques > 0 ? (
              <li>
                <Badge tone="outline" className="h-7 text-[13px] text-muted">
                  +{hiddenTechniques}
                </Badge>
              </li>
            ) : null}
          </ul>
        ) : null}

        {clinical && soap.length > 0 ? (
          <dl className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-2">
            {soap.map((s) => (
              <div key={s.key} className="flex min-w-0 gap-3">
                <dt className="shrink-0">
                  <span
                    aria-hidden
                    className="display inline-flex size-6 items-center justify-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink-2"
                  >
                    {s.letter}
                  </span>
                  <span className="sr-only">{s.label}</span>
                </dt>
                <dd
                  className={cn(
                    "min-w-0 pt-0.5 text-[14px] leading-relaxed break-words whitespace-pre-line text-ink-2",
                    !expanded && "line-clamp-2",
                  )}
                >
                  {s.text}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {clinical && soap.length === 0 && !expanded ? (
          <p className="mt-3 text-[13px] text-subtle">Sin notas SOAP.</p>
        ) : null}

        {extras.length > 0 && (expanded || !clinical) ? (
          <div id={detailsId} className={cn("mt-4 grid gap-3", clinical && "md:grid-cols-2")}>
            {extras.map((e) => (
              <div key={e.key} className="min-w-0 rounded-2xl bg-surface-2 px-4 py-3">
                <p className="flex items-center gap-2 text-[12px] font-medium tracking-wide text-muted uppercase [&_svg]:size-3.5">
                  {e.icon}
                  {clinical ? e.label : "Motivo / notas"}
                </p>
                <p
                  className={cn(
                    "mt-1 text-[14px] leading-relaxed break-words whitespace-pre-line text-ink-2",
                    !expanded && "line-clamp-2",
                  )}
                >
                  {e.text}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {canExpand ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={extras.length > 0 ? detailsId : undefined}
            onClick={() => setExpanded((v) => !v)}
            className="-ml-2 mt-2 inline-flex h-10 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            {expanded ? "Ver menos" : "Ver más"}
            <ChevronDown
              className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")}
              aria-hidden
            />
          </button>
        ) : null}
      </div>
    </article>
  );
}
