import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import {
  buildDashboardData,
  inactiveCutoff,
  MAX_ATTENTION,
  SEVERE_PAIN,
  weekBounds,
  type ChecklistCounts,
  type DashboardPatientRow,
} from "@/components/dashboard/data";
import { isISODate } from "@/components/dashboard/dates";
import { requireProfessional } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { completeOnboarding } from "./actions";

export const metadata: Metadata = { title: "Inicio" };

const SESSION_COLUMNS =
  "id, session_date, start_time, duration_minutes, attendance, techniques, pain_before, pain_after, patient_id, patient:patients!treatment_sessions_patient_fk(id, first_name, last_name)";

const ATTENTION_COLUMNS = "id, first_name, last_name, max_pain, last_session_date, created_at, last_activity_at";

/** PostgREST corta cada respuesta en 1000 filas: el promedio de dolor se pide por páginas. */
const PAGE = 1000;
const MAX_PAIN_PAGES = 20;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** `max_pain` (solo la columna) de todos los pacientes en tratamiento con dolor activo. */
async function fetchActivePains(supabase: Supabase): Promise<number[]> {
  const out: number[] = [];
  for (let page = 0; page < MAX_PAIN_PAGES; page++) {
    const { data, error } = await supabase
      .from("patient_overview")
      .select("max_pain")
      .eq("status", "active")
      .not("max_pain", "is", null)
      .order("id")
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    for (const row of data ?? []) if (row.max_pain != null) out.push(row.max_pain);
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** Último registro de dolor activo (mapa) de cada paciente, para mostrar qué tan actualizado está. */
async function fetchPainUpdatedAt(supabase: Supabase, patientIds: string[]): Promise<Record<string, string>> {
  if (patientIds.length === 0) return {};
  const { data, error } = await supabase
    .from("patient_pain_current")
    .select("patient_id, recorded_at")
    .in("patient_id", patientIds)
    .neq("status", "resolved")
    .gt("intensity", 0)
    .limit(500);
  if (error) {
    // Es un dato accesorio: si falla, el inicio se muestra igual (sin la antigüedad).
    console.error("inicio: patient_pain_current", error.code, error.message);
    return {};
  }
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (!row.patient_id || !row.recorded_at) continue;
    const prev = out[row.patient_id];
    if (!prev || row.recorded_at > prev) out[row.patient_id] = row.recorded_at;
  }
  return out;
}

export default async function InicioPage({ searchParams }: PageProps<"/inicio">) {
  const [professional, params, supabase] = await Promise.all([requireProfessional(), searchParams, createClient()]);

  // "Hoy" y la semana se calculan siempre en el servidor (hora de Argentina).
  // No hay sesiones futuras: un día posterior a hoy muestra hoy.
  const today = todayISO();
  const rawDay = Array.isArray(params.dia) ? params.dia[0] : params.dia;
  const selectedDay = isISODate(rawDay) && rawDay <= today ? rawDay : today;
  const { start, end } = weekBounds(selectedDay);
  const lastDay = end < today ? end : today;
  const needsChecklist = !professional.onboarding_completed_at;
  const countOnly = { count: "exact", head: true } as const;

  // "Sin sesión reciente": última sesión (o alta en kine si nunca vino) anterior al corte.
  const cutoff = inactiveCutoff(today);
  const cutoffStart = `"${cutoff}T00:00:00-03:00"`; // medianoche en Argentina
  const inactiveFilter = `last_session_date.lt.${cutoff},and(last_session_date.is.null,created_at.lt.${cutoffStart})`;

  const [
    activeCountRes,
    severeRes,
    inactiveRes,
    attentionCountRes,
    sessionsRes,
    totalRes,
    painRes,
    sessionCountRes,
    checklistPatientRes,
    activePains,
  ] = await Promise.all([
    supabase.from("patients").select("id", countOnly).eq("status", "active"),
    supabase
      .from("patient_overview")
      .select(ATTENTION_COLUMNS)
      .eq("status", "active")
      .gte("max_pain", SEVERE_PAIN)
      .order("max_pain", { ascending: false })
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .limit(MAX_ATTENTION),
    supabase
      .from("patient_overview")
      .select(ATTENTION_COLUMNS)
      .eq("status", "active")
      .or(inactiveFilter)
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .limit(MAX_ATTENTION * 2),
    supabase
      .from("patient_overview")
      .select("id", countOnly)
      .eq("status", "active")
      .or(`max_pain.gte.${SEVERE_PAIN},${inactiveFilter}`),
    supabase
      .from("treatment_sessions")
      .select(SESSION_COLUMNS)
      .gte("session_date", start)
      .lte("session_date", lastDay)
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .limit(500),
    supabase.from("patients").select("id", countOnly),
    needsChecklist ? supabase.from("pain_records").select("id", countOnly) : null,
    needsChecklist ? supabase.from("treatment_sessions").select("id", countOnly) : null,
    needsChecklist
      ? supabase
          .from("patient_overview")
          .select("id, first_name, last_name")
          .eq("status", "active")
          .order("last_activity_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle()
      : null,
    fetchActivePains(supabase).catch((error: { code?: string; message?: string }) => {
      console.error("inicio: patient_overview max_pain", error.code, error.message);
      throw new Error("No pudimos cargar tu inicio.");
    }),
  ]);

  for (const [label, res] of [
    ["patients activos", activeCountRes],
    ["patient_overview dolor", severeRes],
    ["patient_overview inactivos", inactiveRes],
    ["patient_overview atención", attentionCountRes],
    ["treatment_sessions", sessionsRes],
    ["patients count", totalRes],
  ] as const) {
    if (res.error) {
      console.error(`inicio: ${label}`, res.error.code, res.error.message);
      throw new Error("No pudimos cargar tu inicio.");
    }
  }

  const severeCandidates: DashboardPatientRow[] = severeRes.data ?? [];
  const inactiveCandidates: DashboardPatientRow[] = inactiveRes.data ?? [];
  const withPain = Array.from(
    new Set([...severeCandidates, ...inactiveCandidates].filter((p) => p.id && p.max_pain != null).map((p) => p.id as string)),
  );
  const painUpdatedAt = await fetchPainUpdatedAt(supabase, withPain);

  const totalPatients = totalRes.count ?? 0;
  const checklistCounts: ChecklistCounts | null = needsChecklist
    ? {
        patients: totalPatients,
        painRecords: painRes?.count ?? 0,
        sessions: sessionCountRes?.count ?? 0,
      }
    : null;

  const data = buildDashboardData({
    professional,
    today,
    selectedDay,
    activeCount: activeCountRes.count ?? 0,
    activePains,
    severeCandidates,
    inactiveCandidates,
    attentionTotal: attentionCountRes.count ?? 0,
    painUpdatedAt,
    checklistPatient: checklistPatientRes?.data ?? null,
    weekSessions: sessionsRes.data ?? [],
    totalPatients,
    checklistCounts,
    welcome: params.bienvenida === "1",
  });

  return <DashboardView data={data} dismissOnboardingAction={completeOnboarding} />;
}
