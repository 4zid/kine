import { formatDate, isoWeek, parseDateOnly } from "@/lib/utils";

/**
 * Helpers de fechas "solo día" (YYYY-MM-DD) para el dashboard.
 * Trabajan sobre la fecha local que arma `parseDateOnly` (mediodía), así que no
 * dependen de la zona horaria del servidor. "Hoy" siempre se calcula en el
 * servidor con `todayISO()` (hora de Argentina) y se pasa como prop.
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** true si el valor es una fecha "YYYY-MM-DD" válida (rechaza 2026-02-31). */
export function isISODate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
  const d = parseDateOnly(value);
  return toLocalISO(d) === value;
}

/** Date local => "YYYY-MM-DD" usando sus componentes locales. */
export function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseDateOnly(iso);
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}

/** Lunes de la semana (ISO, lunes a domingo) que contiene `iso`. */
export function mondayOf(iso: string): string {
  const day = parseDateOnly(iso).getDay() || 7; // 1 = lunes … 7 = domingo
  return addDaysISO(iso, 1 - day);
}

/** Diferencia en días enteros (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDateOnly(b).getTime() - parseDateOnly(a).getTime()) / 86_400_000);
}

export function weekNumber(iso: string): number {
  return isoWeek(parseDateOnly(iso));
}

const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/** "Lun", "Mar"… a partir del índice dentro de la semana (0 = lunes). */
export function weekdayShort(index: number): string {
  return WEEKDAY_SHORT[index] ?? "";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Jueves" */
export function weekdayLong(iso: string): string {
  return capitalize(new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(parseDateOnly(iso)));
}

/** "Jueves 8 oct" */
export function formatHeaderDate(iso: string): string {
  return `${weekdayLong(iso)} ${formatDate(iso, { withYear: false })}`;
}

/** "Jueves, 8 de octubre" */
export function formatDayTitle(iso: string): string {
  const d = parseDateOnly(iso);
  const month = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(d);
  return `${weekdayLong(iso)}, ${d.getDate()} de ${month}`;
}

/** "5 – 11 oct" o "28 sept – 4 oct" (agrega el año si la semana cruza de año). */
export function formatWeekRange(start: string, end: string): string {
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  if (s.getFullYear() !== e.getFullYear()) {
    return `${formatDate(start)} – ${formatDate(end)}`;
  }
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${formatDate(end, { withYear: false })}`;
  }
  return `${formatDate(start, { withYear: false })} – ${formatDate(end, { withYear: false })}`;
}

/** "09:00:00" => "09:00" */
export function formatTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

/** 45 => "45 min", 60 => "1 h", 90 => "1 h 30 min" */
export function formatDuration(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
