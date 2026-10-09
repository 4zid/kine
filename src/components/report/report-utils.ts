import { CONDITIONS, DOCUMENT_TYPES, MUSCLE_GRADES, SIDE_OPTIONS, SPECIALTIES } from "@/lib/constants";
import type {
  FunctionalScaleEntry,
  MuscleStrengthEntry,
  Professional,
  RangeOfMotionEntry,
  Side,
  SpecialTestEntry,
} from "@/lib/types";
import type { Json } from "@/lib/database.types";
import { addDays, dayParts, isValidISODate } from "@/components/sessions/session-utils";

// ---------------------------------------------------------------------------
// Período del informe (searchParams: periodo, desde, hasta)
// ---------------------------------------------------------------------------
export type PeriodKind = "todo" | "30d" | "personalizado";

export type ReportPeriod = {
  kind: PeriodKind;
  /** null = desde el principio del tratamiento. */
  from: string | null;
  /** Nunca después de hoy: el informe solo incluye sesiones ya ocurridas. */
  to: string;
  /** Valores para los inputs del filtro personalizado. */
  inputFrom: string;
  inputTo: string;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function resolvePeriod(query: Record<string, string | string[] | undefined>, today: string): ReportPeriod {
  const raw = first(query.periodo);
  const kind: PeriodKind = raw === "30d" || raw === "personalizado" ? raw : "todo";
  const last30 = addDays(today, -29);

  if (kind === "30d") return { kind, from: last30, to: today, inputFrom: last30, inputTo: today };

  if (kind === "personalizado") {
    const d = first(query.desde);
    const h = first(query.hasta);
    let from = d && isValidISODate(d) ? d : last30;
    let to = h && isValidISODate(h) ? h : today;
    if (from > to) [from, to] = [to, from];
    return { kind, from, to: to > today ? today : to, inputFrom: from, inputTo: to };
  }

  return { kind, from: null, to: today, inputFrom: last30, inputTo: today };
}

/** Rango para el título: { main: "10 sept – 8 oct", year: "2026" } (año aparte, en gris). */
export function rangeTitle(from: string, to: string): { main: string; year: string } {
  const a = dayParts(from);
  const b = dayParts(to);
  if (from === to) return { main: `${b.day} ${b.month}`, year: String(b.year) };
  if (a.year !== b.year) return { main: `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month}`, year: String(b.year) };
  if (a.month === b.month) return { main: `${a.day} – ${b.day} ${b.month}`, year: String(b.year) };
  return { main: `${a.day} ${a.month} – ${b.day} ${b.month}`, year: String(b.year) };
}

/**
 * Inicio del día siguiente a `date` en Argentina (UTC−3, sin horario de verano), como timestamptz:
 * sirve para pedir registros con recorded_at hasta el final de `date` (`.lt(...)`).
 */
export function nextDayStartAR(date: string): string {
  return `${addDays(date, 1)}T00:00:00-03:00`;
}

/** Último registro de cada zona (por recorded_at y, a igual momento, por created_at). */
export function latestPerRegion<
  T extends { region: string | null; recorded_at: string | null; created_at: string | null },
>(rows: readonly T[]): T[] {
  const time = (v: string | null) => (v ? Date.parse(v) || 0 : 0);
  const sorted = [...rows].sort(
    (a, b) => time(b.recorded_at) - time(a.recorded_at) || time(b.created_at) - time(a.created_at),
  );
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of sorted) {
    if (!r.region || seen.has(r.region)) continue;
    seen.add(r.region);
    out.push(r);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Etiquetas
// ---------------------------------------------------------------------------
export function licenseLabel(
  p: Pick<Professional, "license_type" | "license_number" | "license_province">,
): string | null {
  if (!p.license_number) return null;
  const prefix = p.license_type === "nacional" ? "MN" : p.license_type === "provincial" ? "MP" : "Mat.";
  return `${prefix} ${p.license_number}${p.license_type === "provincial" && p.license_province ? ` (${p.license_province})` : ""}`;
}

export function specialtyLabels(values: string[] | null | undefined): string[] {
  return (values ?? []).map((v) => SPECIALTIES.find((s) => s.value === v)?.label ?? v);
}

/**
 * Etiqueta del antecedente y si aparece en "Alertas y contraindicaciones". `precaution` distingue
 * los que requieren precaución (no contraindicación) cuando el catálogo lo indica con `severity`.
 */
export function conditionMeta(value: string): { label: string; alert: boolean; precaution: boolean } {
  const c: { label: string; alert?: boolean; severity?: string } | undefined = CONDITIONS.find((x) => x.value === value);
  const alert = Boolean(c?.alert);
  return { label: c?.label ?? value, alert, precaution: alert && c?.severity === "precaution" };
}

/** 30123456 → "DNI 30.123.456". */
export function documentLabel(type: string | null | undefined, number: string | null | undefined): string | null {
  if (!number) return null;
  const formatted =
    (type === "DNI" || type === "LC" || type === "LE") && /^\d{6,9}$/.test(number)
      ? number.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      : number;
  const label = DOCUMENT_TYPES.find((d) => d.value === type)?.label ?? type ?? "Doc.";
  return `${label} ${formatted}`;
}

/** Edad en años a una fecha dada (sin depender del reloj). */
export function ageOn(birthDate: string | null | undefined, today: string): number | null {
  if (!birthDate || !isValidISODate(birthDate)) return null;
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function sideLabel(side: Side | string | null | undefined): string {
  return SIDE_OPTIONS.find((s) => s.value === side)?.label ?? "—";
}

export function gradeLabel(grade: number): string {
  return MUSCLE_GRADES.find((g) => g.value === grade)?.label ?? String(grade);
}

export const TEST_RESULTS: Record<SpecialTestEntry["result"], { label: string; color: string }> = {
  positive: { label: "Positivo", color: "#DC4B3E" },
  negative: { label: "Negativo", color: "#2F9E5B" },
  inconclusive: { label: "No concluyente", color: "#E6A82A" },
};

// ---------------------------------------------------------------------------
// Evaluaciones estructuradas (columnas jsonb: validar la forma antes de usar)
// ---------------------------------------------------------------------------
type Obj = Record<string, unknown>;

function objects(value: Json | null | undefined): Obj[] {
  if (!Array.isArray(value)) return [];
  const list: unknown[] = value;
  return list.filter((v): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v));
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const side = (v: unknown): Side => (v === "right" || v === "left" || v === "bilateral" ? v : "na");

export function parseRangeOfMotion(value: Json | null | undefined): RangeOfMotionEntry[] {
  return objects(value)
    .map((o, i) => ({
      id: str(o.id) || `rom-${i}`,
      joint: str(o.joint),
      movement: str(o.movement),
      side: side(o.side),
      active_deg: num(o.active_deg),
      passive_deg: num(o.passive_deg),
      notes: str(o.notes) || undefined,
    }))
    .filter((e) => e.joint || e.movement);
}

export function parseMuscleStrength(value: Json | null | undefined): MuscleStrengthEntry[] {
  return objects(value).flatMap((o, i) => {
    const g = num(o.grade);
    const muscle = str(o.muscle);
    if (!muscle || g == null || g < 0 || g > 5) return [];
    return [
      { id: str(o.id) || `ms-${i}`, muscle, side: side(o.side), grade: Math.round(g) as MuscleStrengthEntry["grade"] },
    ];
  });
}

export function parseSpecialTests(value: Json | null | undefined): SpecialTestEntry[] {
  return objects(value)
    .map((o, i) => ({
      id: str(o.id) || `st-${i}`,
      name: str(o.name),
      side: side(o.side),
      result: (o.result === "positive" || o.result === "negative"
        ? o.result
        : "inconclusive") as SpecialTestEntry["result"],
      notes: str(o.notes) || undefined,
    }))
    .filter((e) => e.name);
}

export function parseFunctionalScales(value: Json | null | undefined): FunctionalScaleEntry[] {
  return objects(value)
    .map((o, i) => ({
      id: str(o.id) || `fs-${i}`,
      name: str(o.name),
      score: num(o.score),
      max: num(o.max),
      date: isValidISODate(str(o.date)) ? str(o.date) : null,
    }))
    .filter((e) => e.name);
}

// ---------------------------------------------------------------------------
// Técnicas más usadas
// ---------------------------------------------------------------------------
export function techniqueCounts(
  sessions: { techniques: string[] | null; attendance: string }[],
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    if (s.attendance !== "attended") continue;
    for (const t of new Set(s.techniques ?? [])) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return Array.from(counts, ([value, count]) => ({ value, count })).sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value),
  );
}
