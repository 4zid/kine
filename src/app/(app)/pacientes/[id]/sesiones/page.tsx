import type { Metadata } from "next";
import { FlashToast } from "@/components/sessions/flash-toast";
import { SessionsOverview } from "@/components/sessions/sessions-overview";
import { getClinicalHistory, getPatient, getPatientOrNotFound } from "@/lib/data/patients";
import { createClient } from "@/lib/supabase/server";
import { fullName, isUuid, todayISO } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/pacientes/[id]/sesiones">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient ? `Sesiones · ${fullName(patient)}` : "Sesiones" };
}

/** Columnas de las tarjetas (con el texto SOAP): solo para las sesiones visibles. */
const SESSION_CARD_COLUMNS =
  "id, session_date, start_time, duration_minutes, attendance, techniques, pain_before, pain_after, subjective, objective, assessment, plan, home_exercises, notes, created_at";
/** Historial liviano: numeración, estadísticas, gráfico y conteo por mes. */
const SESSION_TIMELINE_COLUMNS = "id, session_date, start_time, attendance, pain_before, pain_after, created_at";

/** Tarjetas por "página" (se suman con "Ver sesiones anteriores"). */
const PAGE_SIZE = 40;
const MAX_VISIBLE = 1000;

function visibleCount(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n > PAGE_SIZE ? Math.min(n, MAX_VISIBLE) : PAGE_SIZE;
}

export default async function SessionsPage({ params, searchParams }: PageProps<"/pacientes/[id]/sesiones">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const patient = await getPatientOrNotFound(id);
  const supabase = await createClient();
  const today = todayISO();
  const limit = visibleCount(query.mostrar);

  const [history, timelineRes, pastRes, futureRes] = await Promise.all([
    getClinicalHistory(patient.id),
    supabase
      .from("treatment_sessions")
      .select(SESSION_TIMELINE_COLUMNS)
      .eq("patient_id", patient.id)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false, nullsFirst: false })
      .limit(MAX_VISIBLE),
    supabase
      .from("treatment_sessions")
      .select(SESSION_CARD_COLUMNS)
      .eq("patient_id", patient.id)
      .lte("session_date", today)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit),
    // Filas viejas con fecha posterior a hoy (antes se podían "agendar"): se muestran para corregirlas.
    supabase
      .from("treatment_sessions")
      .select(SESSION_CARD_COLUMNS)
      .eq("patient_id", patient.id)
      .gt("session_date", today)
      .order("session_date", { ascending: true })
      .limit(100),
  ]);
  if (timelineRes.error || pastRes.error || futureRes.error) throw new Error("No se pudieron cargar las sesiones.");

  const timeline = timelineRes.data ?? [];
  const past = pastRes.data ?? [];
  const pastTotal = timeline.filter((s) => s.session_date <= today).length;
  const moreHref = past.length < pastTotal ? `/pacientes/${patient.id}/sesiones?mostrar=${limit + PAGE_SIZE}` : null;

  // Después de crear una sesión realizada: ofrecer actualizar el mapa corporal vinculado a ella.
  const savedSession = typeof query.sesion === "string" && isUuid(query.sesion) ? query.sesion : null;

  return (
    <>
      {query.guardada ? (
        <FlashToast
          param="guardada"
          extraParams={["sesion"]}
          message="Sesión guardada"
          action={
            savedSession
              ? {
                  label: "Actualizar mapa corporal",
                  href: `/pacientes/${patient.id}/mapa?sesion=${savedSession}`,
                }
              : undefined
          }
        />
      ) : null}
      <SessionsOverview
        patientId={patient.id}
        sessions={[...(futureRes.data ?? []), ...past]}
        timeline={timeline}
        today={today}
        prescribedSessions={history?.prescribed_sessions ?? null}
        sessionFrequency={history?.session_frequency ?? null}
        moreHref={moreHref}
      />
    </>
  );
}
