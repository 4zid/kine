import type { Metadata } from "next";
import { FlashToast } from "@/components/sessions/flash-toast";
import { SessionsOverview } from "@/components/sessions/sessions-overview";
import { getClinicalHistory, getPatient, getPatientOrNotFound } from "@/lib/data/patients";
import { createClient } from "@/lib/supabase/server";
import { fullName, todayISO } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/pacientes/[id]/sesiones">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient ? `Sesiones · ${fullName(patient)}` : "Sesiones" };
}

const SESSION_LIST_COLUMNS =
  "id, session_date, start_time, duration_minutes, attendance, techniques, pain_before, pain_after, subjective, objective, assessment, plan, home_exercises, notes, created_at";

export default async function SessionsPage({ params, searchParams }: PageProps<"/pacientes/[id]/sesiones">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const patient = await getPatientOrNotFound(id);
  const supabase = await createClient();

  const [history, { data: sessions, error }] = await Promise.all([
    getClinicalHistory(patient.id),
    supabase
      .from("treatment_sessions")
      .select(SESSION_LIST_COLUMNS)
      .eq("patient_id", patient.id)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false, nullsFirst: false })
      .limit(1000),
  ]);
  if (error) throw new Error("No se pudieron cargar las sesiones.");

  return (
    <>
      {query.guardada ? <FlashToast param="guardada" message="Sesión guardada" /> : null}
      <SessionsOverview
        patientId={patient.id}
        sessions={sessions ?? []}
        today={todayISO()}
        prescribedSessions={history?.prescribed_sessions ?? null}
        sessionFrequency={history?.session_frequency ?? null}
      />
    </>
  );
}
