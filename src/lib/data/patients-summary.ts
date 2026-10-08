import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
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

export const EMPTY_SUMMARY: PatientSummaryData = {
  attendedCount: 0,
  totalSessions: 0,
  initialPain: null,
  currentPain: null,
  firstSessionDate: null,
  lastSessionDate: null,
  recentSessions: [],
  evolution: [],
  painZones: [],
  studiesCount: 0,
  latestStudy: null,
};

/** Datos agregados para la pestaña Resumen del paciente. Deduplicado por request. */
export const getPatientSummary = cache(async (patientId: string): Promise<PatientSummaryData> => {
  if (!isUuid(patientId)) return EMPTY_SUMMARY;
  const supabase = await createClient();

  const [timelineRes, recentRes, painRes, studiesRes] = await Promise.all([
    // Línea de tiempo liviana (sin textos) para la evolución y el progreso.
    supabase
      .from("treatment_sessions")
      .select("id, session_date, start_time, attendance, pain_before, pain_after")
      .eq("patient_id", patientId)
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true })
      .limit(1000),
    supabase
      .from("treatment_sessions")
      .select("id, session_date, start_time, attendance, pain_before, pain_after, techniques, subjective")
      .eq("patient_id", patientId)
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
      .order("recorded_at", { ascending: false }),
    supabase
      .from("patient_studies")
      .select("id, title, kind, study_date, created_at", { count: "exact" })
      .eq("patient_id", patientId)
      .order("study_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  for (const res of [timelineRes, recentRes, painRes, studiesRes]) {
    if (res.error) console.error("[pacientes] error al cargar el resumen", res.error.message);
  }

  const timeline = timelineRes.data ?? [];
  const attended = timeline.filter((s) => s.attendance === "attended");

  const firstWithBefore = attended.find((s) => s.pain_before != null);
  // EVA actual: la última sesión asistida con dato (al final; si no se midió, al inicio).
  const current = [...attended].reverse().find((s) => s.pain_after != null || s.pain_before != null);
  const currentValue = current ? (current.pain_after ?? current.pain_before) : null;

  const evolution: PainEvolutionPoint[] = attended
    .filter((s) => s.pain_before != null || s.pain_after != null)
    .map((s) => ({ id: s.id, date: s.session_date, before: s.pain_before, after: s.pain_after }));

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

  const study = studiesRes.data?.[0];
  const latestStudy: SummaryStudy | null = study
    ? { id: study.id, title: study.title, kind: asStudyKind(study.kind), study_date: study.study_date, created_at: study.created_at }
    : null;

  return {
    attendedCount: attended.length,
    totalSessions: timeline.length,
    initialPain:
      firstWithBefore && firstWithBefore.pain_before != null
        ? { value: firstWithBefore.pain_before, date: firstWithBefore.session_date }
        : null,
    currentPain: current && currentValue != null ? { value: currentValue, date: current.session_date } : null,
    firstSessionDate: attended[0]?.session_date ?? null,
    lastSessionDate: attended.at(-1)?.session_date ?? null,
    recentSessions,
    evolution,
    painZones,
    studiesCount: studiesRes.count ?? (latestStudy ? 1 : 0),
    latestStudy,
  };
});
