import { CalendarClock, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PainBarsChart, PainLegend } from "@/components/sessions/pain-bars-chart";
import { SessionCard, type SessionCardData } from "@/components/sessions/session-card";
import { SessionsEmpty } from "@/components/sessions/sessions-empty";
import { SessionsSummaryCard } from "@/components/sessions/sessions-summary-card";
import {
  compareSessionsAsc,
  computeSessionStats,
  diffDays,
  monthTitle,
  plural,
  type SessionLike,
} from "@/components/sessions/session-utils";

export type OverviewSession = SessionCardData & Pick<SessionLike, "created_at">;

function relativeLabel(date: string, today: string): string {
  const d = diffDays(date, today);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  if (d < 30) {
    const w = Math.round(d / 7);
    return `hace ${w} ${w === 1 ? "semana" : "semanas"}`;
  }
  const m = Math.round(d / 30);
  return m < 12 ? `hace ${m} ${m === 1 ? "mes" : "meses"}` : "hace más de un año";
}

/**
 * Contenido de la pestaña Sesiones: resumen + gráfico de dolor, próximas sesiones y
 * evolución agrupada por mes. Presentacional: recibe los datos ya leídos en el servidor.
 */
export function SessionsOverview({
  patientId,
  sessions,
  today,
  prescribedSessions,
  sessionFrequency,
}: {
  patientId: string;
  sessions: OverviewSession[];
  /** "YYYY-MM-DD" calculado en el servidor (zona de Argentina). */
  today: string;
  prescribedSessions: number | null;
  sessionFrequency?: string | null;
}) {
  const base = `/pacientes/${patientId}`;
  const newHref = `${base}/sesiones/nueva`;

  if (sessions.length === 0) {
    return <SessionsEmpty newHref={newHref} />;
  }

  const stats = computeSessionStats(sessions, today, prescribedSessions);
  const upcoming = sessions.filter((s) => s.session_date > today).sort(compareSessionsAsc);
  const past = sessions.filter((s) => s.session_date <= today).sort((a, b) => compareSessionsAsc(b, a));

  const months: { key: string; title: string; items: OverviewSession[] }[] = [];
  for (const s of past) {
    const key = s.session_date.slice(0, 7);
    const group = months.at(-1);
    if (group && group.key === key) group.items.push(s);
    else months.push({ key, title: monthTitle(s.session_date), items: [s] });
  }

  const eyebrow = [
    plural(stats.attended, "sesión realizada", "sesiones realizadas"),
    stats.lastDate ? `última ${relativeLabel(stats.lastDate, today)}` : null,
    sessionFrequency ? sessionFrequency : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex animate-fade-up items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] text-muted sm:text-[15px]">{eyebrow.join(" · ")}</p>
          <h2 className="display mt-1 text-[32px] font-normal text-ink sm:text-[40px]">Evolución</h2>
        </div>
        <ButtonLink
          href={newHref}
          icon={<Plus />}
          size="lg"
          className="h-11 px-4 text-sm sm:h-14 sm:px-7 sm:text-[15px]"
        >
          <span className="sr-only sm:not-sr-only">Nueva sesión</span>
          <span aria-hidden className="sm:hidden">
            Nueva
          </span>
        </ButtonLink>
      </div>

      <div className="grid animate-fade-up gap-4 [animation-delay:60ms] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-5">
        <SessionsSummaryCard stats={stats} reportHref={`${base}/informe`} />
        <Card className="flex min-w-0 flex-col">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="display text-[22px] font-medium text-ink sm:text-2xl">Dolor por sesión</h3>
              <p className="mt-1 text-sm text-muted">EVA de 0 a 10 al empezar y al terminar.</p>
            </div>
            <PainLegend className="sm:pt-2" />
          </div>
          <PainBarsChart points={stats.painPoints} className="mt-auto" />
        </Card>
      </div>

      {upcoming.length > 0 ? (
        <section aria-labelledby="sesiones-proximas" className="animate-fade-up [animation-delay:120ms]">
          <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
            <h3 id="sesiones-proximas" className="display flex items-center gap-2 text-xl font-medium text-ink">
              <CalendarClock className="size-5 text-muted" aria-hidden />
              Próximas
            </h3>
            <span className="text-sm text-muted">{plural(upcoming.length, "programada", "programadas")}</span>
          </div>
          <ol className="flex flex-col gap-3">
            {upcoming.map((s) => (
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
            <span className="text-sm text-muted">{plural(m.items.length, "sesión", "sesiones")}</span>
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
    </div>
  );
}
