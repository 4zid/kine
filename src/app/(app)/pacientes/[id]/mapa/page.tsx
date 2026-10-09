import type { Metadata } from "next";
import { BodyMap } from "@/components/body-map/body-map";
import {
  PAIN_RECORD_COLUMNS,
  SESSION_OPTION_COLUMNS,
  type PainRecordItem,
  type SessionOption,
} from "@/components/body-map/types";
import { getPatient, getPatientOrNotFound } from "@/lib/data/patients";
import { createClient } from "@/lib/supabase/server";
import { fullName, isUuid, todayISO } from "@/lib/utils";
import { createPainRecord, deletePainRecord, markRegionResolved, updatePainRecord } from "./actions";

export async function generateMetadata({ params }: PageProps<"/pacientes/[id]/mapa">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient ? `Mapa corporal · ${fullName(patient)}` : "Mapa corporal" };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** PostgREST corta cada respuesta en max_rows (1000 en Supabase): se pide de a páginas. */
const PAGE_SIZE = 1000;
/** Tope de seguridad (≈ 20 años de registros de un paciente crónico). */
const MAX_RECORDS = 20_000;
/** Cuántas sesiones se ofrecen para vincular. */
const SESSION_OPTIONS = 10;

/**
 * TODOS los registros de dolor del paciente, del más nuevo al más viejo, página por página (sin el
 * tope silencioso de 1000 filas), y devueltos ascendentes como los espera el mapa.
 */
async function loadPainRecords(supabase: Supabase, patientId: string) {
  const byId = new Map<string, PainRecordItem>();
  let total: number | null = null;
  let offset = 0;
  while (offset < MAX_RECORDS) {
    const { data, error, count } = await supabase
      .from("pain_records")
      .select(PAIN_RECORD_COLUMNS, offset === 0 ? { count: "exact" } : undefined)
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error("No se pudieron cargar los registros de dolor del paciente.");
    if (offset === 0) total = count ?? null;
    // Si se agregó un registro entre páginas, el corrimiento repite una fila: se deduplica por id.
    for (const r of data) byId.set(r.id, r);
    offset += data.length;
    if (data.length === 0 || (total != null ? offset >= total : data.length < PAGE_SIZE)) break;
  }
  const records = [...byId.values()].reverse();
  return { records, truncated: total != null && total > records.length && offset >= MAX_RECORDS };
}

export default async function PatientBodyMapPage({ params, searchParams }: PageProps<"/pacientes/[id]/mapa">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const patient = await getPatientOrNotFound(id);
  const supabase = await createClient();
  const today = todayISO();
  const requested = typeof sp.sesion === "string" && isUuid(sp.sesion) ? sp.sesion : null;

  // Solo se vinculan sesiones realizadas y con fecha hasta hoy (las futuras no son evolución).
  const linkable = () =>
    supabase
      .from("treatment_sessions")
      .select(SESSION_OPTION_COLUMNS)
      .eq("patient_id", patient.id)
      .eq("attendance", "attended")
      .lte("session_date", today);

  const [{ records, truncated }, sessionsRes, requestedRes] = await Promise.all([
    loadPainRecords(supabase, patient.id),
    linkable()
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(SESSION_OPTIONS),
    requested ? linkable().eq("id", requested).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (sessionsRes.error || requestedRes.error) {
    throw new Error("No se pudieron cargar las sesiones del paciente.");
  }

  const sessions: SessionOption[] = sessionsRes.data;
  // ?sesion=<id> (p. ej. al venir de guardar una sesión): se ofrece aunque no esté entre las últimas.
  const requestedSession = requestedRes.data;
  if (requestedSession && !sessions.some((s) => s.id === requestedSession.id)) {
    sessions.push(requestedSession);
    sessions.sort((a, b) => b.session_date.localeCompare(a.session_date));
  }
  const defaultSessionId = requestedSession?.id ?? sessions.find((s) => s.session_date === today)?.id ?? null;

  // Sesiones vinculadas a registros que no están entre las opciones: solo para nombrarlas.
  const optionIds = new Set(sessions.map((s) => s.id));
  const missing = [...new Set(records.map((r) => r.session_id).filter((s): s is string => Boolean(s && !optionIds.has(s))))];
  const linkedSessions: SessionOption[] = [];
  for (let i = 0; i < missing.length; i += 100) {
    const { data, error } = await supabase
      .from("treatment_sessions")
      .select(SESSION_OPTION_COLUMNS)
      .eq("patient_id", patient.id)
      .in("id", missing.slice(i, i + 100));
    if (error) throw new Error("No se pudieron cargar las sesiones vinculadas.");
    linkedSessions.push(...data);
  }

  return (
    <BodyMap
      patientId={patient.id}
      records={records}
      sessions={sessions}
      linkedSessions={linkedSessions}
      defaultSessionId={defaultSessionId}
      today={today}
      truncated={truncated}
      actions={{ create: createPainRecord, update: updatePainRecord, resolve: markRegionResolved, remove: deletePainRecord }}
    />
  );
}
