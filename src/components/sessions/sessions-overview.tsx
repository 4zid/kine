import { ChevronDown, TriangleAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PainBarsChart, PainLegend } from "@/components/sessions/pain-bars-chart";
import { SessionCard, type SessionCardData } from "@/components/sessions/session-card";
import { SessionsEmpty } from "@/components/sessions/sessions-empty";
import { SessionsSummaryCard } from "@/components/sessions/sessions-summary-card";
import {
  compareSessionsAsc,
  computeSessionStats,
  monthTitle,
  plural,
  relativeDayLabel,
  type SessionLike,
} from "@/components/sessions/session-utils";

export type OverviewSession = SessionCardData & Pick<SessionLike, "created_at">;

/** id del título de la pestaña (destino del foco después de eliminar una sesión). */
export const SESSIONS_HEADING_ID = "sesiones-titulo";

/**
 * Contenido de la pestaña Sesiones: resumen + gráfico de EVA, evolución agrupada por mes y, si
 * quedaron filas viejas con fecha posterior a hoy, un aviso para corregirlas. Presentacional:
 * recibe los datos ya leídos en el servidor.
 *
 * `sessions` son las tarjetas a mostrar (con SOAP); `timeline` (opcional, columnas livianas) es
 * el historial completo para numerar, calcular estadísticas y contar sesiones por mes. Sin
 * `timeline`, se usa `sessions`.
 */
export function SessionsOverview({
  patientId,
  sessions,
  timeline,
  today,
  prescribedSessions,
  sessionFrequency,
  moreHref,
}: {
  patientId: string;
  sessions: OverviewSession[];
  timeline?: SessionLike[];
  /** "YYYY-MM-DD" calculado en el servidor (zona de Argentina). */
  today: string;
  prescribedSessions: number | null;
  sessionFrequency?: string | null;
  /** Enlace para ver sesiones más antiguas (si no se muestran todas). */
  moreHref?: string | null;
}) {
  const base = `/pacientes/${patientId}`;
  const all: SessionLike[] = timeline ?? sessions;

  if (all.length === 0 && sessions.length === 0) {
    return <SessionsEmpty newHref={`${base}/sesiones/nueva`} />;
  }

  const stats = computeSessionStats(all, today, prescribedSessions);
  const future = sessions.filter((s) => s.session_date > today).sort(compareSessionsAsc);
  const past = sessions.filter((s) => s.session_date <= today).sort((a, b) => compareSessionsAsc(b, a));
  const pastTotal = all.filter((s) => s.session_date <= today).length;

  // Cantidad real por mes (del historial completo, aunque el mes se muestre a medias).
  const perMonth = new Map<string, number>();
  for (const s of all) {
    if (s.session_date > today) continue;
    const key = s.session_date.slice(0, 7);
    perMonth.set(key, (perMonth.get(key) ?? 0) + 1);
  }

  const months: { key: string; title: string; items: OverviewSession[] }[] = [];
  for (const s of past) {
    const key = s.session_date.slice(0, 7);
    const group = months.at(-1);
    if (group && group.key === key) group.items.push(s);
    else months.push({ key, title: monthTitle(s.session_date), items: [s] });
  }

  const meta = [
    plural(stats.attended, "sesión realizada", "sesiones realizadas"),
    stats.lastDate ? `última ${relativeDayLabel(stats.lastDate, today)}` : null,
    sessionFrequency ? sessionFrequency : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <div className="animate-fade-up">
        <h2 id={SESSIONS_HEADING_ID} tabIndex={-1} className="display text-2xl font-medium text-ink focus:outline-none">
          Sesiones
        </h2>
        <p className="mt-1 text-[14px] text-muted sm:text-[15px]">{meta.join(" · ")}</p>
      </div>

      <div className="grid animate-fade-up gap-4 [animation-delay:60ms] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-5">
        <SessionsSummaryCard stats={stats} reportHref={`${base}/informe`} />
        <Card className="flex min-w-0 flex-col">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="display text-[22px] font-medium text-ink sm:text-2xl">EVA de la sesión</h3>
              <p className="mt-1 text-sm text-muted">
                EVA (0–10) al empezar y al terminar cada sesión. El dolor por zona está en el mapa corporal.
              </p>
            </div>
            <PainLegend className="sm:pt-2" />
          </div>
          <PainBarsChart points={stats.painPoints} className="mt-auto" />
        </Card>
      </div>

      {future.length > 0 ? (
        <section
          aria-labelledby="sesiones-fecha-futura"
          className="animate-fade-up rounded-card bg-warning-50 p-3 [animation-delay:120ms] sm:p-4"
        >
          <div className="flex items-start gap-3 px-2 pt-2 pb-4 sm:px-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <div className="min-w-0">
              <h3 id="sesiones-fecha-futura" className="text-[15px] font-semibold text-warning">
                {future.length === 1 ? "Una sesión tiene fecha futura" : `${future.length} sesiones tienen fecha futura`}
              </h3>
              <p className="mt-1 text-sm text-ink-2">
                Las sesiones se registran el día en que se realizan, así que estas no cuentan en la evolución. Si ya
                ocurrieron, editá la fecha; si no, eliminalas.
              </p>
            </div>
          </div>
          <ol className="flex flex-col gap-3">
            {future.map((s) => (
              <li key={s.id}>
                <SessionCard patientId={patientId} session={s} upcoming />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {months.map((m, i) => (
        <section
          key={m.key}
          aria-labelledby={`mes-${m.key}`}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(i, 4) * 60 + 120}ms` }}
        >
          <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
            <h3 id={`mes-${m.key}`} className="display text-xl font-medium text-ink">
              {m.title}
            </h3>
            <span className="text-sm text-muted">
              {plural(perMonth.get(m.key) ?? m.items.length, "sesión", "sesiones")}
            </span>
          </div>
          <ol className="flex flex-col gap-3">
            {m.items.map((s) => (
              <li key={s.id}>
                <SessionCard
                  patientId={patientId}
                  session={s}
                  number={stats.numbers[s.id]}
                  isToday={s.session_date === today}
                />
              </li>
            ))}
          </ol>
        </section>
      ))}

      {moreHref && past.length < pastTotal ? (
        <div className="flex flex-col items-center gap-2 pb-2 text-center">
          <ButtonLink href={moreHref} scroll={false} variant="secondary" iconRight={<ChevronDown />}>
            Ver sesiones anteriores
          </ButtonLink>
          <p className="text-[13px] text-muted">
            Se muestran las {past.length} más recientes de {pastTotal}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
