import type { Metadata } from "next";
import { SessionForm } from "@/components/sessions/session-form";
import {
  addDays,
  isValidISODate,
  nowRoundedTime,
  SESSION_MAX_DAYS_AHEAD,
  SESSION_MIN_DATE,
} from "@/components/sessions/session-utils";
import { getPatient, getPatientOrNotFound } from "@/lib/data/patients";
import { createClient } from "@/lib/supabase/server";
import { fullName, todayISO } from "@/lib/utils";
import { createSession } from "../actions";

export async function generateMetadata({ params }: PageProps<"/pacientes/[id]/sesiones/nueva">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient ? `Nueva sesión · ${fullName(patient)}` : "Nueva sesión" };
}

export default async function NewSessionPage({ params, searchParams }: PageProps<"/pacientes/[id]/sesiones/nueva">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const patient = await getPatientOrNotFound(id);
  const supabase = await createClient();
  const today = todayISO();

  // ?fecha=YYYY-MM-DD precarga la fecha (p. ej. desde la agenda del inicio).
  const requested = typeof query.fecha === "string" ? query.fecha : null;
  const date =
    requested &&
    isValidISODate(requested) &&
    requested >= SESSION_MIN_DATE &&
    requested <= addDays(today, SESSION_MAX_DAYS_AHEAD)
      ? requested
      : today;

  const [{ data: previous }, { count: attendedCount }] = await Promise.all([
    supabase
      .from("treatment_sessions")
      .select("session_date, duration_minutes, pain_after, plan, techniques")
      .eq("patient_id", patient.id)
      .eq("attendance", "attended")
      .lte("session_date", today)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("treatment_sessions")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patient.id)
      .eq("attendance", "attended")
      .lte("session_date", today),
  ]);

  const base = `/pacientes/${patient.id}`;

  return (
    <SessionForm
      mode="create"
      action={createSession.bind(null, patient.id)}
      today={today}
      cancelHref={`${base}/sesiones`}
      sessionNumber={date <= today ? (attendedCount ?? 0) + 1 : null}
      previous={
        previous
          ? {
              date: previous.session_date,
              painAfter: previous.pain_after,
              plan: previous.plan,
              techniques: previous.techniques ?? [],
            }
          : null
      }
      initial={{
        session_date: date,
        start_time: nowRoundedTime(),
        duration_minutes: previous?.duration_minutes ?? 45,
        attendance: "attended",
        techniques: [],
        pain_before: null,
        pain_after: null,
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        home_exercises: "",
        notes: "",
      }}
    />
  );
}
