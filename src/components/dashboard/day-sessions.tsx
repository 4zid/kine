import { ArrowRight, CalendarDays, Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge, PainBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ATTENDANCE } from "@/lib/constants";
import { cn, fullName } from "@/lib/utils";
import type { DaySession } from "@/components/dashboard/data";
import { formatDayTitle, formatDuration, formatTime } from "@/components/dashboard/dates";

const MAX_TECHNIQUES = 3;

function SessionRow({ session, index }: { session: DaySession; index: number }) {
  const time = formatTime(session.startTime);
  const duration = formatDuration(session.durationMinutes);
  const attendance = ATTENDANCE[session.attendance];
  const missed = session.attendance !== "attended";
  const extra = session.techniques.length - MAX_TECHNIQUES;
  const hasPain = session.painBefore != null || session.painAfter != null;
  const hasMeta = session.techniques.length > 0 || hasPain;
  const name = fullName(session.patientName);

  return (
    <li
      className={cn(
        "group relative grid animate-fade-up grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 rounded-panel bg-surface-2 p-4 transition-colors hover:bg-surface-3/70 sm:grid-cols-[78px_1fr_auto] sm:gap-x-5 sm:p-5",
        hasMeta
          ? "[grid-template-areas:'time_badge'_'name_name'_'meta_meta'] sm:[grid-template-areas:'time_name_badge'_'time_meta_meta']"
          : "[grid-template-areas:'time_badge'_'name_name'] sm:[grid-template-areas:'time_name_badge']",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-baseline gap-2 self-start [grid-area:time] sm:block">
        <p
          className={cn(
            "display tabular text-[26px] leading-none sm:text-[30px]",
            missed ? "text-muted" : "text-ink",
            !time && "text-subtle",
          )}
        >
          {time ?? "––:––"}
        </p>
        <p className="text-[13px] text-muted sm:mt-2">
          <span aria-hidden className="sm:hidden">· </span>
          {duration ?? (time ? "—" : "Sin horario")}
        </p>
      </div>

      <Badge tone="white" dot={attendance.color} aria-hidden className="justify-self-end [grid-area:badge]">
        {attendance.label}
      </Badge>

      <Link
        href={`/pacientes/${session.patientId}/sesiones`}
        className="flex min-w-0 items-center gap-2.5 font-medium text-ink outline-none [grid-area:name] after:absolute after:inset-0 after:rounded-panel focus-visible:after:shadow-[0_0_0_2px_var(--color-ink)]"
      >
        <Avatar person={{ id: session.patientId, ...session.patientName }} size="sm" />
        <span className="truncate text-[16px]">{name}</span>
        <span className="sr-only">
          , {time ? `${time} h` : "sin horario"}, {attendance.label.toLowerCase()}
          {hasPain ? `, dolor ${session.painBefore ?? "sin dato"} antes y ${session.painAfter ?? "sin dato"} después` : ""}.
          Ver sesiones del paciente
        </span>
      </Link>

      {hasMeta ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2.5 [grid-area:meta]">
          {session.techniques.length > 0 ? (
            <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label="Técnicas">
              {session.techniques.slice(0, MAX_TECHNIQUES).map((t) => (
                <li key={t.value}>
                  <Badge tone="white" dot={t.dot}>
                    {t.label}
                  </Badge>
                </li>
              ))}
              {extra > 0 ? (
                <li>
                  <Badge tone="white" title={session.techniques.slice(MAX_TECHNIQUES).map((t) => t.label).join(", ")}>
                    +{extra}
                  </Badge>
                </li>
              ) : null}
            </ul>
          ) : (
            <span aria-hidden />
          )}
          {hasPain ? (
            <div aria-hidden className="flex items-center gap-1.5">
              <span className="mr-0.5 text-xs font-medium tracking-wide text-subtle">EVA</span>
              <PainBadge intensity={session.painBefore} size="sm" />
              <ArrowRight className="size-3.5 text-subtle" />
              <PainBadge intensity={session.painAfter} size="sm" />
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/** Lista de sesiones del día seleccionado. */
export function DaySessions({
  sessions,
  selectedDay,
  today,
  hasActivePatients,
  className,
}: {
  sessions: DaySession[];
  selectedDay: string;
  today: string;
  hasActivePatients: boolean;
  className?: string;
}) {
  const isToday = selectedDay === today;
  const isFuture = selectedDay > today;
  const attended = sessions.filter((s) => s.attendance === "attended").length;

  return (
    <section aria-labelledby="day-sessions-title" className={cn("rounded-card bg-surface", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-6 pb-5 sm:px-8 sm:pt-7">
        <div className="min-w-0">
          <p className="text-[15px] text-muted">
            Sesiones del día
            {isToday ? <span className="font-medium text-ink"> · Hoy</span> : null}
          </p>
          <h2 id="day-sessions-title" className="display mt-1 text-[26px] font-medium text-ink sm:text-[30px]">
            {formatDayTitle(selectedDay)}
          </h2>
        </div>
        {sessions.length > 0 ? (
          <Badge className="h-9 px-3.5 text-sm">
            {sessions.length === 1 ? "1 sesión" : `${sessions.length} sesiones`}
            {attended !== sessions.length ? <span className="text-muted"> · {attended} asistieron</span> : null}
          </Badge>
        ) : null}
      </div>

      {sessions.length > 0 ? (
        <ul className="space-y-2 px-3 pb-3 sm:px-4 sm:pb-4" key={selectedDay}>
          {sessions.map((s, i) => (
            <SessionRow key={s.id} session={s} index={i} />
          ))}
        </ul>
      ) : (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <EmptyState
            className="rounded-panel bg-surface-2 py-12"
            icon={<CalendarDays strokeWidth={1.6} />}
            title={isFuture ? "Día libre, por ahora" : "Sin sesiones este día"}
            description={
              isFuture
                ? "Las sesiones se registran desde la ficha de cada paciente, el día que lo atendés."
                : hasActivePatients
                  ? "Cuando cargues una sesión desde la ficha de un paciente, va a aparecer acá."
                  : "Agregá un paciente y registrá su primera sesión para verla acá."
            }
            action={
              hasActivePatients ? (
                <ButtonLink href="/pacientes" variant="secondary" icon={<Users />}>
                  Ir a pacientes
                </ButtonLink>
              ) : (
                <ButtonLink href="/pacientes/nuevo" variant="primary" iconRight={<ArrowRight />}>
                  Agregá un paciente
                </ButtonLink>
              )
            }
          />
        </div>
      )}
    </section>
  );
}
