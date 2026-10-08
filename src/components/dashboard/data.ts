import { DOT_COLORS, TECHNIQUES } from "@/lib/constants";
import type { Attendance, PatientOverview, Professional, TreatmentSession } from "@/lib/types";
import { fullName, toISODate } from "@/lib/utils";
import {
  addDaysISO,
  diffDays,
  formatWeekRange,
  mondayOf,
  weekNumber,
  weekdayShort,
} from "@/components/dashboard/dates";

// ---------------------------------------------------------------------------
// Entradas (filas tal como llegan de Supabase)
// ---------------------------------------------------------------------------
export type DashboardPatientRow = Pick<
  PatientOverview,
  "id" | "first_name" | "last_name" | "max_pain" | "active_regions" | "last_session_date" | "created_at"
>;

type EmbeddedPatient = { id: string; first_name: string; last_name: string };

export type DashboardSessionRow = Pick<
  TreatmentSession,
  | "id"
  | "session_date"
  | "start_time"
  | "duration_minutes"
  | "attendance"
  | "techniques"
  | "pain_before"
  | "pain_after"
  | "patient_id"
> & {
  /** Embebido vía FK compuesta. PostgREST lo devuelve como objeto (por las dudas, aceptamos array). */
  patient: EmbeddedPatient | EmbeddedPatient[] | null;
};

export type ChecklistCounts = {
  patients: number;
  painRecords: number;
  sessions: number;
};

export type DashboardInput = {
  professional: Pick<Professional, "first_name" | "license_number" | "specialties" | "onboarding_completed_at">;
  /** Hoy en Argentina (YYYY-MM-DD), calculado en el servidor. */
  today: string;
  /** Día seleccionado (YYYY-MM-DD) ya validado. */
  selectedDay: string;
  /** Pacientes activos (vista patient_overview). */
  activePatients: DashboardPatientRow[];
  /** Sesiones de la semana visible. */
  weekSessions: DashboardSessionRow[];
  /** Total de pacientes del profesional (cualquier estado). */
  totalPatients: number;
  /** Conteos para "Primeros pasos" (null si la guía ya se ocultó). */
  checklistCounts: ChecklistCounts | null;
  welcome?: boolean;
};

// ---------------------------------------------------------------------------
// Salida (props planas para los componentes de presentación)
// ---------------------------------------------------------------------------
export type WeekDay = {
  iso: string;
  label: string; // "Lun"
  dayNumber: number;
  sessionCount: number;
  attended: boolean;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
};

export type DaySession = {
  id: string;
  patientId: string;
  patientName: { first_name: string; last_name: string };
  startTime: string | null; // "09:00:00"
  durationMinutes: number | null;
  attendance: Attendance;
  techniques: { value: string; label: string; dot: string }[];
  painBefore: number | null;
  painAfter: number | null;
};

export type AttentionReason =
  | { kind: "pain"; intensity: number }
  | { kind: "inactive"; days: number; neverAttended: boolean };

export type AttentionItem = {
  id: string;
  first_name: string;
  last_name: string;
  maxPain: number | null;
  reasons: AttentionReason[];
};

export type ChecklistStep = {
  key: "profile" | "patient" | "pain" | "session";
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
};

export type DashboardData = {
  firstName: string;
  today: string;
  selectedDay: string;
  welcome: boolean;
  isNewAccount: boolean;
  week: {
    start: string;
    end: string;
    number: number;
    rangeLabel: string;
    isCurrent: boolean;
    prevDay: string;
    nextDay: string;
    days: WeekDay[];
  };
  summary: {
    activePatients: number;
    attendedSessions: number;
    daysWithSessions: number;
    avgPain: number | null;
    severeCount: number;
  };
  attendance: {
    attended: number;
    absent: number;
    cancelled: number;
    /** 0-100, o null si no hubo turnos con asistencia definida. */
    rate: number | null;
  };
  daySessions: DaySession[];
  attention: AttentionItem[];
  attentionTotal: number;
  checklist: ChecklistStep[] | null;
};

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------
export const SEVERE_PAIN = 7;
export const INACTIVE_DAYS = 14;
const MAX_ATTENTION = 5;

const TECHNIQUE_META = new Map(
  TECHNIQUES.map((t, i) => [t.value, { label: t.label, dot: DOT_COLORS[i % DOT_COLORS.length] }]),
);

function techniqueMeta(value: string) {
  return TECHNIQUE_META.get(value) ?? { label: value, dot: DOT_COLORS[DOT_COLORS.length - 1] };
}

function asAttendance(value: string): Attendance {
  return value === "absent" || value === "cancelled" ? value : "attended";
}

function embeddedPatient(row: DashboardSessionRow): EmbeddedPatient | null {
  if (Array.isArray(row.patient)) return row.patient[0] ?? null;
  return row.patient;
}

function compareTime(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a < b ? -1 : 1;
}

/** Rango [lunes, domingo] de la semana que contiene `day`. */
export function weekBounds(day: string) {
  const start = mondayOf(day);
  return { start, end: addDaysISO(start, 6) };
}

export function buildDashboardData(input: DashboardInput): DashboardData {
  const { today, selectedDay, activePatients, weekSessions, professional } = input;
  const { start, end } = weekBounds(selectedDay);

  // --- Semana -----------------------------------------------------------------
  const byDay = new Map<string, DashboardSessionRow[]>();
  for (const s of weekSessions) {
    const list = byDay.get(s.session_date) ?? [];
    list.push(s);
    byDay.set(s.session_date, list);
  }

  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const iso = addDaysISO(start, i);
    const list = byDay.get(iso) ?? [];
    return {
      iso,
      label: weekdayShort(i),
      dayNumber: Number(iso.slice(8, 10)),
      sessionCount: list.length,
      attended: list.some((s) => s.attendance === "attended"),
      isToday: iso === today,
      isSelected: iso === selectedDay,
      isFuture: iso > today,
    };
  });

  // --- Asistencia -------------------------------------------------------------
  let attended = 0;
  let absent = 0;
  let cancelled = 0;
  for (const s of weekSessions) {
    const a = asAttendance(s.attendance);
    if (a === "attended") attended++;
    else if (a === "absent") absent++;
    else cancelled++;
  }
  const denominator = attended + absent;
  const rate = denominator > 0 ? Math.round((attended / denominator) * 100) : null;

  // --- Resumen ----------------------------------------------------------------
  const pains = activePatients.map((p) => p.max_pain).filter((v): v is number => v != null);
  const avgPain = pains.length > 0 ? pains.reduce((a, b) => a + b, 0) / pains.length : null;
  const severeCount = pains.filter((v) => v >= SEVERE_PAIN).length;

  // --- Sesiones del día -------------------------------------------------------
  const daySessions: DaySession[] = (byDay.get(selectedDay) ?? [])
    .slice()
    .sort((a, b) => compareTime(a.start_time, b.start_time))
    .map((s) => {
      const p = embeddedPatient(s);
      return {
        id: s.id,
        patientId: s.patient_id,
        patientName: { first_name: p?.first_name ?? "Paciente", last_name: p?.last_name ?? "" },
        startTime: s.start_time,
        durationMinutes: s.duration_minutes,
        attendance: asAttendance(s.attendance),
        techniques: (s.techniques ?? []).map((t) => ({ value: t, ...techniqueMeta(t) })),
        painBefore: s.pain_before,
        painAfter: s.pain_after,
      };
    });

  // --- Requieren atención -----------------------------------------------------
  const attentionAll: AttentionItem[] = [];
  for (const p of activePatients) {
    if (!p.id) continue;
    const reasons: AttentionReason[] = [];
    if (p.max_pain != null && p.max_pain >= SEVERE_PAIN) {
      reasons.push({ kind: "pain", intensity: p.max_pain });
    }
    // Referencia: última sesión a la que asistió; si nunca vino, el día en que se lo cargó en kine.
    const reference = p.last_session_date ?? (p.created_at ? toISODate(new Date(p.created_at)) : null);
    if (reference) {
      const days = diffDays(reference, today);
      if (days > INACTIVE_DAYS) {
        reasons.push({ kind: "inactive", days, neverAttended: p.last_session_date == null });
      }
    }
    if (reasons.length > 0) {
      attentionAll.push({
        id: p.id,
        first_name: p.first_name ?? "",
        last_name: p.last_name ?? "",
        maxPain: p.max_pain,
        reasons,
      });
    }
  }
  const inactiveDays = (item: AttentionItem) =>
    item.reasons.reduce((acc, r) => (r.kind === "inactive" ? Math.max(acc, r.days) : acc), 0);
  attentionAll.sort((a, b) => (b.maxPain ?? -1) - (a.maxPain ?? -1) || inactiveDays(b) - inactiveDays(a));

  // --- Primeros pasos ---------------------------------------------------------
  let checklist: ChecklistStep[] | null = null;
  if (!professional.onboarding_completed_at && input.checklistCounts) {
    const c = input.checklistCounts;
    // Si ya hay pacientes, los pasos clínicos llevan directo a la ficha del más reciente.
    const first = activePatients.find((p) => p.id);
    const firstName = first ? fullName(first) : null;
    checklist = [
      {
        key: "profile",
        title: "Completá tu perfil profesional",
        description: "Matrícula y especialidades: aparecen en tus informes.",
        href: "/ajustes#datos-profesionales",
        cta: "Ir a ajustes",
        done: Boolean(professional.license_number?.trim()) && professional.specialties.length > 0,
      },
      {
        key: "patient",
        title: "Agregá tu primer paciente",
        description: "Datos personales, cobertura y motivo de consulta.",
        href: "/pacientes/nuevo",
        cta: "Nuevo paciente",
        done: c.patients > 0,
      },
      {
        key: "pain",
        title: "Registrá un dolor en el mapa corporal",
        description: firstName
          ? `Tocá la zona del cuerpo de ${firstName} y marcá su intensidad.`
          : "Tocá la zona del cuerpo y marcá su intensidad.",
        href: first ? `/pacientes/${first.id}/mapa` : "/pacientes",
        cta: first ? "Abrir mapa" : "Ver pacientes",
        done: c.painRecords > 0,
      },
      {
        key: "session",
        title: "Cargá tu primera sesión",
        description: "Evolución SOAP, técnicas y dolor antes y después.",
        href: first ? `/pacientes/${first.id}/sesiones` : "/pacientes",
        cta: first ? "Cargar sesión" : "Ver pacientes",
        done: c.sessions > 0,
      },
    ];
  }

  return {
    firstName: professional.first_name?.trim() ?? "",
    today,
    selectedDay,
    welcome: Boolean(input.welcome),
    isNewAccount: input.totalPatients === 0,
    week: {
      start,
      end,
      number: weekNumber(start),
      rangeLabel: formatWeekRange(start, end),
      isCurrent: start === mondayOf(today),
      prevDay: addDaysISO(selectedDay, -7),
      nextDay: addDaysISO(selectedDay, 7),
      days,
    },
    summary: {
      activePatients: activePatients.length,
      attendedSessions: attended,
      daysWithSessions: days.filter((d) => d.attended).length,
      avgPain,
      severeCount,
    },
    attendance: { attended, absent, cancelled, rate },
    daySessions,
    attention: attentionAll.slice(0, MAX_ATTENTION),
    attentionTotal: attentionAll.length,
    checklist,
  };
}
