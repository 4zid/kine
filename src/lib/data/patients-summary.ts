import "server-only";
import { cache } from "react";
import { computeSessionStats } from "@/components/sessions/session-utils";
import { createClient } from "@/lib/supabase/server";
import { isUuid, todayISO } from "@/lib/utils";
import type { Attendance, PainStatus, StudyKind } from "@/lib/types";
import type {
  PainEvolutionPoint,
  PatientSummaryData,
  SummaryPainZone,
  SummarySession,
  SummaryStudy,
} from "@/lib/data/patients-types";

const ATTENDANCES: Attendance[] = ["attended", "absent", "cancelled"];
const PAIN_STATUSES: PainStatus[] = ["active", "improving", "resolved"];
const STUDY_KINDS: StudyKind[] = ["xray", "mri", "ultrasound", "ct", "emg", "densitometry", "lab", "medical_report", "other"];

const asAttendance = (v: string): Attendance => (ATTENDANCES.includes(v as Attendance) ? (v as Attendance) : "attended");
const asPainStatus = (v: string | null): PainStatus =>
  PAIN_STATUSES.includes(v as PainStatus) ? (v as PainStatus) : "active";
const asStudyKind = (v: string): StudyKind => (STUDY_KINDS.includes(v as StudyKind) ? (v as StudyKind) : "other");

/**
 * Tope explícito de la línea de tiempo (PostgREST corta en 1000 filas sin avisar). Se piden las
 * más recientes primero para que, si alguna vez se supera, lo que falte sea lo más antiguo y
 * nunca la última sesión ni la EVA actual.
 */
const TIMELINE_LIMIT = 1000;

export const EMPTY_SUMMARY: PatientSummaryData = {
  attendedCount: 0,
  totalSessions: 0,
  initialPain: null,
  currentPain: null,
  improvementPct: null,
  firstSessionDate: null,
  lastSessionDate: null,
  recentSessions: [],
  evolution: [],
  painZones: [],
  painUpdatedAt: null,
  studiesCount: 0,
  latestStudy: null,
};

/**
 * Datos agregados para la pestaña Resumen del paciente. Deduplicado por request.
 *
 * Reglas compartidas con el resto de la app:
 * - Solo cuentan las sesiones ya ocurridas (`session_date ≤ hoy` en Argentina): las fechas
 *   futuras no son sesiones realizadas.
 * - Asistencia, EVA inicial/actual y mejoría salen de `computeSessionStats` (misma regla que la
 *   pestaña Sesiones y el informe).
 * - Si alguna consulta falla, lanza: es preferible el error.tsx ("Reintentar") a mostrar un
 *   resumen clínico incompleto como si estuviera vacío.
 */
export const getPatientSummary = cache(async (patientId: string): Promise<PatientSummaryData> => {
  if (!isUuid(patientId)) return EMPTY_SUMMARY;
  const supabase = await createClient();
  const today = todayISO();

  const [timelineRes, recentRes, painRes, studiesRes] = await Promise.all([
    // Línea de tiempo liviana (sin textos) para la evolución y el progreso.
    supabase
      .from("treatment_sessions")
      .select("id, session_date, start_time, attendance, pain_before, pain_after, created_at")
      .eq("patient_id", patientId)
      .lte("session_date", today)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(TIMELINE_LIMIT),
    supabase
      .from("treatment_sessions")
      .select("id, session_date, start_time, attendance, pain_before, pain_after, techniques, subjective")
      .eq("patient_id", patientId)
      .lte("session_date", today)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("patient_pain_current")
      .select("id, region, view, intensity, status, recorded_at, pain_types")
      .eq("patient_id", patientId)
      .neq("status", "resolved")
      .gt("intensity", 0)
      .order("intensity", { ascending: false })
      .order("recorded_at", { ascending: false })
      .limit(200),
    supabase
      .from("patient_studies")
      .select("id, title, kind, study_date, created_at", { count: "exact" })
      .eq("patient_id", patientId)
      .order("study_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const failed = [timelineRes, recentRes, painRes, studiesRes].find((res) => res.error)?.error;
  if (failed) {
    console.error("[pacientes] error al cargar el resumen", failed.code, failed.message);
    throw new Error("No pudimos cargar el resumen del paciente.");
  }

  const timeline = timelineRes.data ?? [];
  const stats = computeSessionStats(timeline, today);
  const firstPoint = stats.painPoints.find((p) => p.before != null) ?? null;
  const lastPoint = stats.painPoints.at(-1) ?? null;

  const evolution: PainEvolutionPoint[] = stats.painPoints.map((p) => ({
    id: p.id,
    date: p.date,
    before: p.before,
    after: p.after,
  }));

  const recentSessions: SummarySession[] = (recentRes.data ?? []).map((s) => ({
    id: s.id,
    session_date: s.session_date,
    start_time: s.start_time,
    attendance: asAttendance(s.attendance),
    pain_before: s.pain_before,
    pain_after: s.pain_after,
    techniques: s.techniques ?? [],
    subjective: s.subjective,
  }));

  const painZones: SummaryPainZone[] = [];
  for (const z of painRes.data ?? []) {
    if (!z.id || !z.region || z.intensity == null || !z.recorded_at) continue;
    painZones.push({
      id: z.id,
      region: z.region,
      view: z.view ?? "front",
      intensity: z.intensity,
      status: asPainStatus(z.status),
      recorded_at: z.recorded_at,
      pain_types: z.pain_types ?? [],
    });
  }
  const painUpdatedAt = painZones.reduce<string | null>(
    (latest, z) => (latest == null || z.recorded_at > latest ? z.recorded_at : latest),
    null,
  );

  const study = studiesRes.data?.[0];
  const latestStudy: SummaryStudy | null = study
    ? { id: study.id, title: study.title, kind: asStudyKind(study.kind), study_date: study.study_date, created_at: study.created_at }
    : null;

  const attendedDates = stats.attended > 0;

  return {
    attendedCount: stats.attended,
    totalSessions: stats.pastCount,
    initialPain:
      stats.initialPain != null && firstPoint ? { value: stats.initialPain, date: firstPoint.date } : null,
    currentPain: stats.latestPain != null && lastPoint ? { value: stats.latestPain, date: lastPoint.date } : null,
    improvementPct: stats.improvementPct,
    firstSessionDate: attendedDates ? stats.firstDate : null,
    lastSessionDate: attendedDates ? stats.lastDate : null,
    recentSessions,
    evolution,
    painZones,
    painUpdatedAt,
    studiesCount: studiesRes.count ?? (latestStudy ? 1 : 0),
    latestStudy,
  };
});
