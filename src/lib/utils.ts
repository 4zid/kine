import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Fechas (zona horaria de Argentina, formato es-AR)
// ---------------------------------------------------------------------------
export const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";
const LOCALE = "es-AR";

/** Parsea "YYYY-MM-DD" como fecha local (sin corrimiento de zona horaria). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}

/** Fecha de hoy en Argentina como "YYYY-MM-DD". */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Convierte un Date a "YYYY-MM-DD" en la zona horaria de Argentina. */
export function toISODate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts; // en-CA => YYYY-MM-DD
}

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  return value.length <= 10 ? parseDateOnly(value) : new Date(value);
}

/** "8 oct 2026" */
export function formatDate(value: string | Date | null | undefined, opts?: { withYear?: boolean }): string {
  if (!value) return "—";
  const date = toDate(value);
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    ...(opts?.withYear === false ? {} : { year: "numeric" }),
    timeZone: typeof value === "string" && value.length <= 10 ? undefined : APP_TIME_ZONE,
  })
    .format(date)
    .replace(/\./g, "");
}

/** "jueves, 8 de octubre" */
export function formatLongDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: typeof value === "string" && value.length <= 10 ? undefined : APP_TIME_ZONE,
  }).format(date);
}

/** "8 oct, 14:30" */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  })
    .format(toDate(value))
    .replace(/\./g, "");
}

/** "hace 3 días", "hoy", "ayer" (para fechas pasadas). */
export function formatRelativeDay(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  const today = parseDateOnly(todayISO());
  const target = parseDateOnly(toISODate(date));
  const diff = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  if (diff === -1) return "mañana";
  if (diff > 1 && diff < 7) return `hace ${diff} días`;
  if (diff >= 7 && diff < 30) {
    const w = Math.round(diff / 7);
    return `hace ${w} ${w === 1 ? "semana" : "semanas"}`;
  }
  if (diff >= 30 && diff < 365) {
    const m = Math.round(diff / 30);
    return `hace ${m} ${m === 1 ? "mes" : "meses"}`;
  }
  if (diff < 0) return formatDate(date);
  const y = Math.round(diff / 365);
  return `hace ${y} ${y === 1 ? "año" : "años"}`;
}

/** Edad en años a partir de "YYYY-MM-DD". */
export function ageFromBirthDate(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = parseDateOnly(birthDate);
  const today = parseDateOnly(todayISO());
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

/** Número de semana ISO. */
export function isoWeek(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------
export function fullName(p: { first_name?: string | null; last_name?: string | null }): string {
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "Sin nombre";
}

export function initials(p: { first_name?: string | null; last_name?: string | null }): string {
  const a = (p.first_name ?? "").trim().charAt(0);
  const b = (p.last_name ?? "").trim().charAt(0);
  return (a + b).toUpperCase() || "?";
}

const AVATAR_TONES = [
  { bg: "#FDE7EF", fg: "#B4416F" },
  { bg: "#E3F1E8", fg: "#22704A" },
  { bg: "#E6ECFD", fg: "#2F5BD0" },
  { bg: "#FDEEE2", fg: "#C1561F" },
  { bg: "#EFE9FB", fg: "#5B42C2" },
  { bg: "#FBF4DD", fg: "#9A7414" },
  { bg: "#E2F3F4", fg: "#1F7A80" },
];

/** Color estable para el avatar según un id/nombre. */
export function avatarTone(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

// ---------------------------------------------------------------------------
// Escala de dolor (EVA 0-10)
// ---------------------------------------------------------------------------
export const PAIN_COLORS = [
  "#C9E8D3", // 0
  "#B6E2A1", // 1
  "#D3E58C", // 2
  "#EEDD72", // 3
  "#F6C85A", // 4
  "#F5AD4D", // 5
  "#F18E43", // 6
  "#EA6C3B", // 7
  "#DE4D35", // 8
  "#C93434", // 9
  "#A3203A", // 10
] as const;

export function painColor(intensity: number | null | undefined): string {
  if (intensity == null || Number.isNaN(intensity)) return "#E4E4EA";
  const i = Math.max(0, Math.min(10, Math.round(intensity)));
  return PAIN_COLORS[i];
}

/** Color de texto legible sobre `painColor(intensity)`. */
export function painTextColor(intensity: number | null | undefined): string {
  if (intensity == null) return "#3A3A42";
  return intensity >= 7 ? "#FFFFFF" : "#2A1A10";
}

export function painLevel(intensity: number | null | undefined): "none" | "mild" | "moderate" | "severe" {
  if (intensity == null || intensity === 0) return "none";
  if (intensity <= 3) return "mild";
  if (intensity <= 6) return "moderate";
  return "severe";
}

// ---------------------------------------------------------------------------
// Formularios
// ---------------------------------------------------------------------------
/** Lee un campo de texto de FormData: trim y vacío => null. */
export function formText(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** Lee un número de FormData (acepta coma decimal). Vacío o inválido => null. */
export function formNumber(fd: FormData, key: string): number | null {
  const v = formText(fd, key);
  if (v == null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Lee todos los valores de un campo múltiple (checkboxes / chips). */
export function formList(fd: FormData, key: string): string[] {
  return fd
    .getAll(key)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Número con coma decimal es-AR: 5.2 => "5,2". */
export function formatDecimal(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** true si el string es un UUID válido (evita errores 22P02 de Postgres). */
export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
