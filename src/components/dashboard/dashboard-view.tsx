import { Plus, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AttendanceCard } from "@/components/dashboard/attendance-card";
import { AttentionList } from "@/components/dashboard/attention-list";
import type { DashboardData } from "@/components/dashboard/data";
import { diffDays, formatHeaderDate, mondayOf, weekNumber } from "@/components/dashboard/dates";
import { DaySessions } from "@/components/dashboard/day-sessions";
import { FeatureCard, NewAccountHero } from "@/components/dashboard/new-account";
import { OnboardingChecklist, type FormAction } from "@/components/dashboard/onboarding-checklist";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { WeekStrip } from "@/components/dashboard/week-strip";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";

const COMPACT_ON_MOBILE = "max-sm:h-10 max-sm:px-4 max-sm:text-[13px]";

/**
 * Inicio del kinesiólogo. Componente de presentación: recibe todos los datos ya
 * calculados en el servidor (ver `buildDashboardData`).
 */
export function DashboardView({
  data,
  dismissOnboardingAction,
  basePath = "/inicio",
}: {
  data: DashboardData;
  dismissOnboardingAction: FormAction;
  /** Ruta base para la navegación por días (vistas previas). */
  basePath?: string;
}) {
  const { today, week, summary } = data;
  const hasActivePatients = summary.activePatients > 0;
  const name = data.firstName || "colega";

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        className="animate-fade-up"
        eyebrow={
          <>
            Hola, <strong>{name}</strong> · Semana <strong>{weekNumber(today)}</strong>
          </>
        }
        title={formatHeaderDate(today)}
        titleMuted={today.slice(0, 4)}
        actions={
          <>
            <ButtonLink href="/pacientes" variant="secondary" icon={<Users />} className={COMPACT_ON_MOBILE}>
              Ver pacientes
            </ButtonLink>
            <ButtonLink href="/pacientes/nuevo" variant="primary" icon={<Plus />} className={COMPACT_ON_MOBILE}>
              Nuevo paciente
            </ButtonLink>
          </>
        }
      />

      {data.welcome ? <WelcomeBanner firstName={data.firstName} /> : null}

      {data.isNewAccount ? (
        <>
          <NewAccountHero todayIndex={diffDays(mondayOf(today), today)} />
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
            {data.checklist ? (
              <OnboardingChecklist
                steps={data.checklist}
                dismissAction={dismissOnboardingAction}
                className="xl:col-span-7"
              />
            ) : null}
            <FeatureCard wide={!data.checklist} className={data.checklist ? "xl:col-span-5" : "xl:col-span-12"} />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <SummaryCard summary={summary} week={week} className="animate-fade-up xl:col-span-7" />
            <AttendanceCard
              attendance={data.attendance}
              days={week.days}
              className="animate-fade-up [animation-delay:60ms] xl:col-span-5"
            />
          </div>

          <WeekStrip week={week} today={today} basePath={basePath} className="pt-2" />

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
            <DaySessions
              sessions={data.daySessions}
              selectedDay={data.selectedDay}
              today={today}
              hasActivePatients={hasActivePatients}
              className="xl:col-span-7"
            />
            <div className="flex min-w-0 flex-col gap-5 xl:col-span-5">
              {data.checklist ? (
                <OnboardingChecklist steps={data.checklist} dismissAction={dismissOnboardingAction} />
              ) : null}
              <AttentionList items={data.attention} total={data.attentionTotal} hasActivePatients={hasActivePatients} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
