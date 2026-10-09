import type { Metadata } from "next";
import { SessionForm } from "@/components/sessions/session-form";
import {
  isValidISODate,
  nowRoundedTime,
  SESSION_MIN_DATE,
  sessionNumberOn,
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

  // ?fecha=YYYY-MM-DD precarga la fecha (p. ej. para cargar una sesión de un día anterior).
  // Las sesiones documentan encuentros ya ocurridos: nunca después de hoy.
  const requested = typeof query.fecha === "string" ? query.fecha : null;
  const date =
    requested && isValidISODate(requested) && requested >= SESSION_MIN_DATE && requested <= today ? requested : today;

  const [{ data: previous }, { data: attended, error: attendedError }] = await Promise.all([
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
    // Liviano: fechas y horarios de las sesiones realizadas, para numerar la nueva según la fecha elegida.
    supabase
      .from("treatment_sessions")
      .select("session_date, start_time")
      .eq("patient_id", patient.id)
      .eq("attendance", "attended")
      .lte("session_date", today)
      .order("session_date", { ascending: false })
      .limit(1000),
  ]);

  const attendedSlots = attendedError
    ? undefined
    : (attended ?? []).map((s) => ({ date: s.session_date, time: s.start_time }));
  const startTime = nowRoundedTime();
  const base = `/pacientes/${patient.id}`;

  return (
    <SessionForm
      mode="create"
      action={createSession.bind(null, patient.id)}
      today={today}
      cancelHref={`${base}/sesiones`}
      attendedSlots={attendedSlots}
      sessionNumber={attendedSlots ? sessionNumberOn(attendedSlots, date, startTime, today) : null}
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
        start_time: startTime,
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
