import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeleteSessionButton } from "@/components/sessions/delete-session";
import { SessionForm } from "@/components/sessions/session-form";
import { computeSessionStats, isAttendance, longDate, toHHMM } from "@/components/sessions/session-utils";
import { getPatient, getPatientOrNotFound } from "@/lib/data/patients";
import { createClient } from "@/lib/supabase/server";
import { fullName, isUuid, todayISO } from "@/lib/utils";
import { updateSession } from "../../actions";

export async function generateMetadata({
  params,
}: PageProps<"/pacientes/[id]/sesiones/[sessionId]/editar">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient ? `Editar sesión · ${fullName(patient)}` : "Editar sesión" };
}

export default async function EditSessionPage({ params }: PageProps<"/pacientes/[id]/sesiones/[sessionId]/editar">) {
  const { id, sessionId } = await params;
  if (!isUuid(sessionId)) notFound();
  const patient = await getPatientOrNotFound(id);
  const supabase = await createClient();
  const today = todayISO();

  const [{ data: session }, { data: timeline }] = await Promise.all([
    supabase.from("treatment_sessions").select("*").eq("id", sessionId).eq("patient_id", patient.id).maybeSingle(),
    // Liviano: solo para numerar la sesión dentro del tratamiento.
    supabase
      .from("treatment_sessions")
      .select("id, session_date, start_time, attendance, pain_before, pain_after, created_at")
      .eq("patient_id", patient.id)
      .limit(1000),
  ]);
  if (!session) notFound();

  const number = computeSessionStats(timeline ?? [], today).numbers[session.id] ?? null;
  const listHref = `/pacientes/${patient.id}/sesiones`;

  return (
    <SessionForm
      mode="edit"
      action={updateSession.bind(null, patient.id, session.id)}
      today={today}
      cancelHref={listHref}
      sessionNumber={number}
      footerStart={
        <DeleteSessionButton
          patientId={patient.id}
          sessionId={session.id}
          dateLabel={longDate(session.session_date).toLowerCase()}
          redirectTo={listHref}
        />
      }
      initial={{
        session_date: session.session_date,
        start_time: toHHMM(session.start_time),
        duration_minutes: session.duration_minutes,
        attendance: isAttendance(session.attendance) ? session.attendance : "attended",
        techniques: session.techniques ?? [],
        pain_before: session.pain_before,
        pain_after: session.pain_after,
        subjective: session.subjective ?? "",
        objective: session.objective ?? "",
        assessment: session.assessment ?? "",
        plan: session.plan ?? "",
        home_exercises: session.home_exercises ?? "",
        notes: session.notes ?? "",
      }}
    />
  );
}
