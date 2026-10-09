import {
  CONDITIONS,
  DOCUMENT_TYPES,
  DOMINANT_SIDE_OPTIONS,
  PATIENT_STATUS,
  SEX_OPTIONS,
  TECHNIQUES,
} from "@/lib/constants";
import type { ClinicalHistory, PatientStatus } from "@/lib/types";
import { ageFromBirthDate, parseDateOnly } from "@/lib/utils";

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function sexLabel(sex: string | null | undefined): string | null {
  return SEX_OPTIONS.find((o) => o.value === sex)?.label ?? null;
}

export function dominantSideLabel(side: string | null | undefined): string | null {
  return DOMINANT_SIDE_OPTIONS.find((o) => o.value === side)?.label ?? null;
}

export function statusMeta(status: string | null | undefined) {
  return PATIENT_STATUS[(status as PatientStatus) ?? "active"] ?? PATIENT_STATUS.active;
}

/** 30123456 => "30.123.456" para DNI/LC/LE; el resto tal cual. */
export function formatDocumentNumber(type: string | null | undefined, number: string | null | undefined): string | null {
  if (!number) return null;
  if ((type === "DNI" || type === "LC" || type === "LE") && /^\d{6,9}$/.test(number)) {
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  return number;
}

/** "DNI 30.123.456" */
export function documentLabel(type: string | null | undefined, number: string | null | undefined): string | null {
  const formatted = formatDocumentNumber(type, number);
  if (!formatted) return null;
  const typeLabel = DOCUMENT_TYPES.find((o) => o.value === type)?.label ?? type ?? "Doc.";
  return `${typeLabel} ${formatted}`;
}

export function ageLabel(birthDate: string | null | undefined): string | null {
  const age = ageFromBirthDate(birthDate);
  if (age == null) return null;
  return age === 1 ? "1 año" : `${age} años`;
}

/** Edad en años en una fecha dada ("YYYY-MM-DD"), sin depender del reloj del cliente. */
export function ageOn(birthDate: string, today: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function techniqueLabel(value: string): string {
  return TECHNIQUES.find((t) => t.value === value)?.label ?? value;
}

/** Teléfono para href tel: (solo dígitos y +). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export type ClinicalAlert = {
  key: string;
  label: string;
  detail?: string;
  /** "precaution" = requiere precaución (tono más suave que una contraindicación). */
  tone?: "alert" | "precaution";
};

/** Marcas de un antecedente: `alert` (contraindicación) y, si el catálogo la define, `precaution`. */
type ConditionFlags = { alert?: boolean; precaution?: boolean };

/**
 * Alertas clínicas relevantes para contraindicaciones: antecedentes con `alert`, después los que
 * requieren precaución (si el catálogo los marca), alergias y banderas rojas.
 */
export function clinicalAlerts(history: Pick<ClinicalHistory, "conditions" | "allergies" | "red_flags"> | null): ClinicalAlert[] {
  if (!history) return [];
  const alerts: ClinicalAlert[] = [];
  const precautions: ClinicalAlert[] = [];
  for (const value of history.conditions ?? []) {
    const condition = CONDITIONS.find((c) => c.value === value);
    if (!condition) continue;
    const flags = condition as ConditionFlags;
    if (flags.alert) alerts.push({ key: condition.value, label: condition.label, tone: "alert" });
    else if (flags.precaution) precautions.push({ key: condition.value, label: condition.label, tone: "precaution" });
  }
  alerts.push(...precautions);
  const allergies = history.allergies?.trim();
  if (allergies) alerts.push({ key: "allergies", label: "Alergia", detail: allergies });
  const redFlags = history.red_flags?.trim();
  if (redFlags) alerts.push({ key: "red_flags", label: "Banderas rojas", detail: redFlags });
  return alerts;
}

/** Partes de una fecha "YYYY-MM-DD" para tarjetas de día: { weekday: "Jue", day: "8", month: "oct" }. */
export function dayParts(date: string): { weekday: string; day: string; month: string } {
  const d = parseDateOnly(date);
  const weekday = new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(d).replace(/\./g, "");
  const month = new Intl.DateTimeFormat("es-AR", { month: "short" }).format(d).replace(/\./g, "");
  return { weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1), day: String(d.getDate()), month };
}

/** Recorta un texto largo en el límite de una palabra. */
export function excerpt(value: string | null | undefined, max = 140): string | null {
  const t = value?.replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
