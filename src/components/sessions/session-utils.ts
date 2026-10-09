import { DOT_COLORS, TECHNIQUES } from "@/lib/constants";
import type { Attendance, TreatmentSession } from "@/lib/types";

/**
 * Helpers puros del módulo de sesiones (sin "use client": sirven en servidor y cliente).
 *
 * Las fechas se manejan como strings "YYYY-MM-DD" con aritmética UTC y nombres en español
 * fijos (no Intl) para que el HTML del servidor y el del cliente coincidan siempre.
 */

// ---------------------------------------------------------------------------
// Límites (espejan los CHECK de treatment_sessions)
// ---------------------------------------------------------------------------
export const SESSION_TEXT_MAX = 8000;
export const SESSION_MIN_DATE = "2000-01-01";
/**
 * Una sesión es la nota de evolución de un encuentro que ya ocurrió: no se registran sesiones
 * con fecha futura (tope = hoy en Argentina). Se conserva el nombre por compatibilidad.
 */
export const SESSION_MAX_DAYS_AHEAD = 0;
/** Mensaje de validación para fechas posteriores a hoy (formulario y Server Action). */
export const FUTURE_SESSION_MESSAGE = "La sesión no puede tener fecha futura: registrala el día en que se realiza.";
export const DURATION_MIN = 1;
export const DURATION_MAX = 600;

export const SESSION_TEXT_FIELDS = [
  "subjective",
  "objective",
  "assessment",
  "plan",
  "home_exercises",
  "notes",
] as const;
export type SessionTextField = (typeof SESSION_TEXT_FIELDS)[number];

/** Valores del formulario de sesión (estado controlado del cliente). */
export type SessionFormValues = {
  session_date: string;
  start_time: string;
  duration_minutes: number | null;
  attendance: Attendance;
  techniques: string[];
  pain_before: number | null;
  pain_after: number | null;
} & Record<SessionTextField, string>;

// ---------------------------------------------------------------------------
// Series del gráfico (dolor al inicio / al final). Colores validados (ΔE CVD 34, ≥3:1).
// ---------------------------------------------------------------------------
export { PAIN_SERIES } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Fechas deterministas
// ---------------------------------------------------------------------------
const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;
const WEEKDAYS_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"] as const;
const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** true si es un "YYYY-MM-DD" que existe en el calendario (rechaza 2026-02-30). */
export function isValidISODate(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function utc(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Lunes de la semana de `iso` (semana lunes → domingo). */
export function mondayOf(iso: string): string {
  const d = utc(iso);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  return addDays(iso, -dow);
}

/** Diferencia en días (b − a). */
export function diffDays(a: string, b: string): number {
  return Math.round((utc(b).getTime() - utc(a).getTime()) / 86_400_000);
}

export type DayParts = {
  weekday: string; // "Jue"
  weekdayLong: string; // "jueves"
  day: number; // 8
  month: string; // "oct"
  monthLong: string; // "octubre"
  year: number;
};

export function dayParts(iso: string): DayParts {
  const d = utc(iso);
  return {
    weekday: WEEKDAYS_SHORT[d.getUTCDay()],
    weekdayLong: WEEKDAYS_LONG[d.getUTCDay()],
    day: d.getUTCDate(),
    month: MONTHS_SHORT[d.getUTCMonth()],
    monthLong: MONTHS_LONG[d.getUTCMonth()],
    year: d.getUTCFullYear(),
  };
}

/** "8 oct" (o "8 oct 2025" con año). */
export function shortDate(iso: string, withYear = false): string {
  const p = dayParts(iso);
  return withYear ? `${p.day} ${p.month} ${p.year}` : `${p.day} ${p.month}`;
}

/** "Jueves, 8 de octubre" (+ " de 2025" si se pide año). */
export function longDate(iso: string, withYear = false): string {
  const p = dayParts(iso);
  const s = `${p.weekdayLong}, ${p.day} de ${p.monthLong}${withYear ? ` de ${p.year}` : ""}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "hoy", "ayer", "hace 3 días", "hace 2 semanas", "hace 4 meses"… (fecha ≤ hoy). */
export function relativeDayLabel(date: string, today: string): string {
  const d = diffDays(date.slice(0, 10), today);
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  if (d < 30) {
    const w = Math.round(d / 7);
    return `hace ${w} ${w === 1 ? "semana" : "semanas"}`;
  }
  const m = Math.round(d / 30);
  return m < 12 ? `hace ${m} ${m === 1 ? "mes" : "meses"}` : "hace más de un año";
}

/** "8 de octubre de 2026" */
export function fullDate(iso: string): string {
  const p = dayParts(iso);
  return `${p.day} de ${p.monthLong} de ${p.year}`;
}

/** "Octubre 2026" */
export function monthTitle(iso: string): string {
  const p = dayParts(iso);
  return `${p.monthLong.charAt(0).toUpperCase()}${p.monthLong.slice(1)} ${p.year}`;
}

/** Hora/minutos actuales en Argentina redondeados a 15 min ("09:15"). Solo llamar en el servidor. */
export function nowRoundedTime(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 9);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  let total = Math.round((h * 60 + m) / 15) * 15;
  if (total >= 24 * 60) total = 24 * 60 - 15;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Horarios y duraciones
// ---------------------------------------------------------------------------
/** "09:00:00" (columna time) → "09:00". */
export function toHHMM(time: string | null | undefined): string {
  if (!time) return "";
  const m = /^(\d{2}):(\d{2})/.exec(time);
  return m ? `${m[1]}:${m[2]}` : "";
}

/** "09:00" + 45 → "09:45" (si pasa la medianoche, devuelve null). */
export function endTime(start: string, minutes: number | null | undefined): string | null {
  const m = /^(\d{2}):(\d{2})$/.exec(start);
  if (!m || !minutes) return null;
  const total = Number(m[1]) * 60 + Number(m[2]) + minutes;
  if (total >= 24 * 60) return null;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** 30 → "30 min", 60 → "1 h", 90 → "1 h 30". */
export function durationLabel(minutes: number | null | undefined): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

// ---------------------------------------------------------------------------
// Técnicas
// ---------------------------------------------------------------------------
export const TECHNIQUE_VALUES = TECHNIQUES.map((t) => t.value);

/** Color de punto estable por técnica (según su posición en el catálogo). */
export function techniqueColor(value: string): string {
  const i = TECHNIQUE_VALUES.indexOf(value);
  return DOT_COLORS[(i < 0 ? TECHNIQUE_VALUES.length : i) % DOT_COLORS.length];
}

export function techniqueLabel(value: string): string {
  return TECHNIQUES.find((t) => t.value === value)?.label ?? value;
}

export const TECHNIQUE_OPTIONS = TECHNIQUES.map((t) => ({
  value: t.value,
  label: t.label,
  dot: techniqueColor(t.value),
}));

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** 5.25 → "5,3" · 5 → "5". */
export function formatScore(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}

// ---------------------------------------------------------------------------
// Estadísticas de tratamiento
// ---------------------------------------------------------------------------
export type SessionLike = Pick<
  TreatmentSession,
  "id" | "session_date" | "start_time" | "attendance" | "pain_before" | "pain_after" | "created_at"
>;

/** Orden cronológico: fecha, hora (sin hora primero) y fecha de carga. */
export function compareSessionsAsc(a: SessionLike, b: SessionLike): number {
  if (a.session_date !== b.session_date) return a.session_date < b.session_date ? -1 : 1;
  const ta = a.start_time ?? "";
  const tb = b.start_time ?? "";
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

export type PainPoint = {
  id: string;
  date: string;
  /** "8 oct" */
  label: string;
  /** "Jueves, 8 de octubre de 2026" */
  longLabel: string;
  /** Número de sesión realizada (1, 2, 3…). */
  number: number;
  before: number | null;
  after: number | null;
};

export type SessionStats = {
  /** Sesiones con fecha ≤ hoy. */
  pastCount: number;
  upcomingCount: number;
  attended: number;
  absent: number;
  cancelled: number;
  /** Asistidas / (asistidas + ausentes). Las canceladas no cuentan. 0-100. */
  attendanceRate: number | null;
  avgBefore: number | null;
  avgAfter: number | null;
  /** Dolor al inicio de la primera sesión realizada con registro. */
  initialPain: number | null;
  /** Último dolor registrado (al final, o al inicio si no se cargó el final). */
  latestPain: number | null;
  /** Mejoría % entre initialPain y latestPain (negativo = empeoró). */
  improvementPct: number | null;
  prescribed: number | null;
  firstDate: string | null;
  lastDate: string | null;
  /** Puntos del gráfico: sesiones realizadas con algún registro de dolor (cronológico). */
  painPoints: PainPoint[];
  /** id de sesión → número de sesión realizada. */
  numbers: Record<string, number>;
};

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Estadísticas del tratamiento (regla de referencia para toda la app).
 *
 * - Solo cuentan como realizadas las sesiones con attendance = "attended" y fecha ≤ `today`
 *   (defensivo: filas viejas con fecha futura no suman).
 * - Numeración: 1, 2, 3… sobre las realizadas, en orden cronológico (compareSessionsAsc).
 * - Mejoría % = (dolor al inicio de la primera sesión realizada − dolor final de la última, o su
 *   dolor inicial si no se cargó el final) / dolor al inicio de la primera. Con un único registro
 *   no hay comparación (null).
 */
export function computeSessionStats(
  sessions: SessionLike[],
  today: string,
  prescribed: number | null = null,
): SessionStats {
  const sorted = [...sessions].sort(compareSessionsAsc);
  const past = sorted.filter((s) => s.session_date <= today);
  const attendedList = past.filter((s) => s.attendance === "attended");
  const absent = past.filter((s) => s.attendance === "absent").length;
  const cancelled = past.filter((s) => s.attendance === "cancelled").length;

  const numbers: Record<string, number> = {};
  attendedList.forEach((s, i) => {
    numbers[s.id] = i + 1;
  });

  const painPoints: PainPoint[] = attendedList
    .filter((s) => s.pain_before != null || s.pain_after != null)
    .map((s) => ({
      id: s.id,
      date: s.session_date,
      label: shortDate(s.session_date),
      longLabel: longDate(s.session_date, true),
      number: numbers[s.id],
      before: s.pain_before,
      after: s.pain_after,
    }));

  const initial = attendedList.find((s) => s.pain_before != null) ?? null;
  const latestWithPain = [...attendedList].reverse().find((s) => s.pain_after != null || s.pain_before != null) ?? null;
  const initialPain = initial?.pain_before ?? null;
  const latestPain = latestWithPain ? (latestWithPain.pain_after ?? latestWithPain.pain_before) : null;
  // Con un único registro (misma sesión y sin dolor final) no hay contra qué comparar.
  const comparable = Boolean(initial && latestWithPain) && !(latestWithPain === initial && initial?.pain_after == null);
  const improvementPct =
    comparable && initialPain != null && initialPain > 0 && latestPain != null
      ? Math.round(((initialPain - latestPain) / initialPain) * 100)
      : null;

  const counted = attendedList.length + absent;

  return {
    pastCount: past.length,
    upcomingCount: sorted.length - past.length,
    attended: attendedList.length,
    absent,
    cancelled,
    attendanceRate: counted > 0 ? Math.round((attendedList.length / counted) * 100) : null,
    avgBefore: avg(attendedList.map((s) => s.pain_before).filter((v): v is number => v != null)),
    avgAfter: avg(attendedList.map((s) => s.pain_after).filter((v): v is number => v != null)),
    initialPain,
    latestPain,
    improvementPct,
    prescribed: prescribed && prescribed > 0 ? prescribed : null,
    firstDate: attendedList[0]?.session_date ?? past[0]?.session_date ?? null,
    lastDate: attendedList.at(-1)?.session_date ?? past.at(-1)?.session_date ?? null,
    painPoints,
    numbers,
  };
}

/** Fecha y horario de una sesión realizada (para numerar una sesión nueva o editada). */
export type AttendedSlot = { date: string; time: string | null };

/**
 * Número que le corresponde a una sesión realizada el `date` (a las `time`) entre las ya
 * realizadas `attended` (sin incluirse a sí misma): las anteriores + 1. Sigue el orden de
 * compareSessionsAsc (sin horario primero; a igual fecha y hora, la nueva va última).
 * Devuelve null si la fecha no es válida o es posterior a hoy.
 */
export function sessionNumberOn(
  attended: AttendedSlot[],
  date: string,
  time: string | null,
  today: string,
): number | null {
  if (!isValidISODate(date) || date > today) return null;
  const t = toHHMM(time);
  const before = attended.filter(
    (s) => s.date <= today && (s.date < date || (s.date === date && toHHMM(s.time) <= t)),
  ).length;
  return before + 1;
}

/** Texto de la mejoría: "52 % menos dolor", "Sin cambios", "20 % más dolor". */
export function improvementText(pct: number | null): string | null {
  if (pct == null) return null;
  if (pct === 0) return "Sin cambios";
  return pct > 0 ? `${pct} % menos dolor` : `${Math.abs(pct)} % más dolor`;
}

export function isAttendance(value: string): value is Attendance {
  return value === "attended" || value === "absent" || value === "cancelled";
}
