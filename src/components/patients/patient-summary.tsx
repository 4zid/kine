import type { ReactNode } from "react";
import { NextStepsCard } from "@/components/patients/next-steps-card";
import {
  CoverageCard,
  EmergencyContactCard,
  EvolutionCard,
  NotesCard,
  PainNowCard,
  PersonalDataCard,
  ProgressCard,
  ReasonCard,
  RecentSessionsCard,
  StudiesCard,
} from "@/components/patients/summary-cards";
import type { PatientSummaryData } from "@/lib/data/patients-types";
import type { ClinicalHistory, Patient } from "@/lib/types";

/** ¿Se editó la historia clínica alguna vez? (el trigger la crea vacía junto con el paciente). */
function historyStarted(history: Pick<ClinicalHistory, "created_at" | "updated_at"> | null): boolean {
  if (!history) return false;
  return new Date(history.updated_at).getTime() - new Date(history.created_at).getTime() > 2000;
}

/**
 * Pestaña Resumen: grilla "bento" con lo esencial del paciente.
 * `bodyMapSlot` reserva el lugar para la vista previa del mapa corporal (otro módulo).
 */
export function PatientSummary({
  patient,
  history,
  summary,
  isNew = false,
  bodyMapSlot,
}: {
  patient: Patient;
  history: ClinicalHistory | null;
  summary: PatientSummaryData;
  isNew?: boolean;
  bodyMapSlot?: ReactNode;
}) {
  const done = {
    history: historyStarted(history),
    pain: summary.painZones.length > 0,
    session: summary.totalSessions > 0,
  };
  const showSteps = isNew || (!done.session && !(done.history && done.pain));

  return (
    <section aria-labelledby="patient-summary-title" className="flex flex-col gap-4 lg:gap-5">
      <h2 id="patient-summary-title" className="display text-2xl font-medium text-ink">
        Resumen
      </h2>
      <div className="animate-fade-up grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5 xl:grid-cols-12 [&>*]:min-w-0">
        {showSteps ? (
          <NextStepsCard
            patientId={patient.id}
            firstName={patient.first_name}
            done={done}
            tone={isNew ? "welcome" : "subtle"}
            className="md:col-span-2 xl:col-span-12"
          />
        ) : null}

        <ReasonCard patient={patient} className="md:col-span-2 xl:col-span-7" />
        <ProgressCard
          patientId={patient.id}
          summary={summary}
          prescribedSessions={history?.prescribed_sessions ?? null}
          className="md:col-span-2 xl:col-span-5"
        />

        <PainNowCard
          patientId={patient.id}
          zones={summary.painZones}
          bodyMapSlot={bodyMapSlot}
          className="md:col-span-2 xl:col-span-7"
        />
        <EvolutionCard patientId={patient.id} evolution={summary.evolution} className="md:col-span-2 xl:col-span-5" />

        <RecentSessionsCard
          patientId={patient.id}
          sessions={summary.recentSessions}
          totalSessions={summary.totalSessions}
          className="md:col-span-2 xl:col-span-7"
        />
        <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2 lg:gap-5 xl:col-span-5 xl:grid-cols-1 [&>*]:min-w-0">
          <StudiesCard patientId={patient.id} count={summary.studiesCount} latest={summary.latestStudy} />
          <NotesCard patient={patient} />
        </div>

        <PersonalDataCard patient={patient} className="md:col-span-2 xl:col-span-7" />
        <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2 lg:gap-5 xl:col-span-5 xl:grid-cols-1 [&>*]:min-w-0">
          <CoverageCard patient={patient} />
          <EmergencyContactCard patient={patient} />
        </div>
      </div>
    </section>
  );
}
