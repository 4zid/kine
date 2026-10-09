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
/** Candidato a "Requieren atención" (vista patient_overview, solo las columnas necesarias). */
export type DashboardPatientRow = Pick<
  PatientOverview,
  "id" | "first_name" | "last_name" | "max_pain" | "last_session_date" | "created_at" | "last_activity_at"
>;

export type DashboardChecklistPatient = Pick<PatientOverview, "id" | "first_name" | "last_name">;

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
  /** Día seleccionado (YYYY-MM-DD) ya validado. Si es posterior a hoy, se usa hoy. */
  selectedDay: string;
  /** Pacientes en tratamiento (conteo exacto). */
  activeCount: number;
  /**
   * Dolor actual por zona (mapa corporal) de cada paciente en tratamiento con dolor
   * activo: `patient_overview.max_pain` (zonas no resueltas con intensidad > 0).
   */
  activePains: number[];
  /** En tratamiento con dolor intenso: de mayor a menor, y con actividad más reciente primero. */
  severeCandidates: DashboardPatientRow[];
  /** En tratamiento sin sesión reciente: actividad más reciente primero. */
  inactiveCandidates: DashboardPatientRow[];
  /** Total de pacientes que requieren atención (conteo exacto). */
  attentionTotal: number;
  /** Último registro de dolor activo en el mapa, por paciente (ISO), para mostrar su antigüedad. */
  painUpdatedAt?: Record<string, string>;
  /** Paciente con actividad más reciente (atajos de "Primeros pasos"). */
  checklistPatient?: DashboardChecklistPatient | null;
  /** Sesiones de la semana visible (hasta hoy). */
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
  /** Edición de la sesión (para completar la evolución del día). */
  href: string;
};

export type AttentionReason =
  | { kind: "pain"; intensity: number }
  | { kind: "inactive"; days: number; neverAttended: boolean };

export type AttentionItem = {
  id: string;
  first_name: string;
  last_name: string;
  /** Dolor actual por zona (mapa corporal). */
  maxPain: number | null;
  /** Cuándo se registró ese dolor en el mapa (ISO), o null si no se sabe. */
  painUpdatedAt: string | null;
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
    /** Día de la semana siguiente (nunca posterior a hoy). */
    nextDay: string;
    /** false en la semana actual: no hay sesiones futuras que ver. */
    canGoNext: boolean;
    days: WeekDay[];
  };
  summary: {
    activePatients: number;
    attendedSessions: number;
    daysWithSessions: number;
    /** Promedio del dolor actual por zona (mapa) de los pacientes con dolor activo. */
    avgPain: number | null;
    severeCount: number;
  };
  attendance: {
    attended: number;
    absent: number;
    cancelled: number;
    /** 0-100, o null si no hubo sesiones con asistencia definida. */
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
export const MAX_ATTENTION = 5;

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

/**
 * Fecha límite de "sin sesión reciente": la última sesión (o el alta en kine, si
 * nunca vino) es anterior a este día. Coincide con `diffDays(referencia, hoy) > INACTIVE_DAYS`.
 */
export function inactiveCutoff(today: string): string {
  return addDaysISO(today, -INACTIVE_DAYS);
}

/** Motivos por los que un paciente requiere atención: dolor intenso en el mapa o sin sesión reciente. */
function attentionReasons(p: DashboardPatientRow, today: string): AttentionReason[] {
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
  return reasons;
}

export function buildDashboardData(input: DashboardInput): DashboardData {
  const { today, professional } = input;
  // Las sesiones registran atenciones que ya ocurrieron: nunca mostramos días futuros.
  const selectedDay = input.selectedDay > today ? today : input.selectedDay;
  const { start, end } = weekBounds(selectedDay);
  const currentMonday = mondayOf(today);
  // Defensivo: filas viejas con fecha futura no cuentan como sesiones hechas.
  const weekSessions = input.weekSessions.filter((s) => s.session_date <= today);

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
      attended: iso <= today && list.some((s) => s.attendance === "attended"),
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
  // Dolor activo = intensidad > 0 (la vista ya devuelve null si no hay zonas activas).
  const pains = input.activePains.filter((v) => Number.isFinite(v) && v > 0);
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
        href: `/pacientes/${s.patient_id}/sesiones/${s.id}/editar`,
      };
    });

  // --- Requieren atención -----------------------------------------------------
  // Primero dolor intenso (de mayor a menor); después sin sesión reciente (actividad más reciente primero).
  const painUpdatedAt = input.painUpdatedAt ?? {};
  const attentionById = new Map<string, AttentionItem>();
  for (const p of [...input.severeCandidates, ...input.inactiveCandidates]) {
    if (!p.id || attentionById.has(p.id)) continue;
    const reasons = attentionReasons(p, today);
    if (reasons.length === 0) continue;
    attentionById.set(p.id, {
      id: p.id,
      first_name: p.first_name ?? "",
      last_name: p.last_name ?? "",
      maxPain: p.max_pain,
      painUpdatedAt: p.max_pain != null ? (painUpdatedAt[p.id] ?? null) : null,
      reasons,
    });
  }
  const attention = Array.from(attentionById.values()).slice(0, MAX_ATTENTION);

  // --- Primeros pasos ---------------------------------------------------------
  let checklist: ChecklistStep[] | null = null;
  if (!professional.onboarding_completed_at && input.checklistCounts) {
    const c = input.checklistCounts;
    // Si ya hay pacientes, los pasos clínicos llevan directo a la ficha del más reciente.
    const first = input.checklistPatient?.id ? input.checklistPatient : null;
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
        title: "Registrá tu primera sesión",
        description: "Después de atender: evolución SOAP, técnicas y EVA antes y después.",
        href: first ? `/pacientes/${first.id}/sesiones/nueva` : "/pacientes",
        cta: first ? "Nueva sesión" : "Ver pacientes",
        done: c.sessions > 0,
      },
    ];
  }

  const nextDay = addDaysISO(selectedDay, 7);
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
      isCurrent: start === currentMonday,
      prevDay: addDaysISO(selectedDay, -7),
      nextDay: nextDay > today ? today : nextDay,
      canGoNext: start < currentMonday,
      days,
    },
    summary: {
      activePatients: input.activeCount,
      attendedSessions: attended,
      daysWithSessions: days.filter((d) => d.attended).length,
      avgPain,
      severeCount,
    },
    attendance: { attended, absent, cancelled, rate },
    daySessions,
    attention,
    attentionTotal: Math.max(input.attentionTotal, attentionById.size),
    checklist,
  };
}
