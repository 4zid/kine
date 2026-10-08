"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PAIN_RECORD_COLUMNS, type PainFormState } from "@/components/body-map/types";
import { getActionContext } from "@/lib/auth";
import { getRegion, isValidRegion } from "@/lib/body-regions";
import { PAIN_FREQUENCY, PAIN_TYPES } from "@/lib/constants";
import type { ActionState, BodyView, PainFrequency, PainStatus } from "@/lib/types";
import { formList, formText, isUuid, todayISO } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Validación (espeja los CHECK de public.pain_records)
// ---------------------------------------------------------------------------
const PAIN_TYPE_VALUES = PAIN_TYPES.map((o) => o.value) as [string, ...string[]];
const FREQUENCY_VALUES = PAIN_FREQUENCY.map((o) => o.value) as [PainFrequency, ...PainFrequency[]];
const STATUS_VALUES: [PainStatus, ...PainStatus[]] = ["active", "improving", "resolved"];
const VIEW_VALUES: [BodyView, ...BodyView[]] = ["front", "back"];

const optionalText = (max: number) =>
  z.string().max(max, `Máximo ${max.toLocaleString("es-AR")} caracteres.`).nullable();

const optionalDate = z.iso.date("Fecha inválida.").nullable();

const painRecordSchema = z
  .object({
    patient_id: z.string().refine((v) => isUuid(v), "Paciente inválido."),
    region: z.string().regex(/^[a-z0-9_]{2,60}$/, "Zona inválida."),
    view: z.enum(VIEW_VALUES, "Vista inválida."),
    intensity: z
      .number("Elegí la intensidad del dolor (0 a 10).")
      .int("La intensidad debe ser un número entero.")
      .min(0, "La intensidad va de 0 a 10.")
      .max(10, "La intensidad va de 0 a 10."),
    pain_types: z.array(z.enum(PAIN_TYPE_VALUES, "Tipo de dolor inválido.")).max(PAIN_TYPE_VALUES.length),
    frequency: z.enum(FREQUENCY_VALUES, "Frecuencia inválida.").nullable(),
    status: z.enum(STATUS_VALUES, "Estado inválido."),
    started_on: optionalDate,
    recorded_on: optionalDate,
    irradiation: optionalText(1000),
    aggravating_factors: optionalText(2000),
    relieving_factors: optionalText(2000),
    notes: optionalText(4000),
    session_id: z
      .string()
      .refine((v) => isUuid(v), "Sesión inválida.")
      .nullable(),
    point_x: z.number().min(0).max(1).nullable(),
    point_y: z.number().min(0).max(1).nullable(),
  })
  .superRefine((v, ctx) => {
    const today = todayISO();
    if (!isValidRegion(v.region, v.view)) {
      ctx.addIssue({ code: "custom", path: ["region"], message: "La zona no corresponde a esa vista del cuerpo." });
    }
    if ((v.point_x == null) !== (v.point_y == null)) {
      ctx.addIssue({ code: "custom", path: ["point"], message: "El punto marcado está incompleto." });
    }
    if (v.started_on && v.started_on > today) {
      ctx.addIssue({ code: "custom", path: ["started_on"], message: "No puede ser una fecha futura." });
    }
    if (v.started_on && v.started_on < "1900-01-01") {
      ctx.addIssue({ code: "custom", path: ["started_on"], message: "Revisá la fecha." });
    }
    if (v.recorded_on && v.recorded_on > today) {
      ctx.addIssue({ code: "custom", path: ["recorded_on"], message: "No puede ser una fecha futura." });
    }
    if (v.recorded_on && v.started_on && v.started_on > v.recorded_on) {
      ctx.addIssue({ code: "custom", path: ["started_on"], message: "No puede ser posterior a la fecha del registro." });
    }
  });

function numberOrNull(fd: FormData, key: string): number | null {
  const raw = formText(fd, key);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}

function fieldErrorsFrom(error: z.ZodError): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Errores de Postgres/PostgREST → mensajes claros. */
function friendlyDbError(error: { code?: string }, fallback: string): string {
  switch (error.code) {
    case "23503":
      return "El paciente o la sesión vinculada ya no existen. Recargá la página.";
    case "23505":
      return "Ese registro ya existe.";
    case "23514":
    case "22007":
    case "22P02":
      return "Algún dato no es válido. Revisá el formulario.";
    case "42501":
      return "No tenés permiso para modificar los datos de este paciente.";
    default:
      return fallback;
  }
}

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a ingresar para continuar.";

function revalidatePatient(patientId: string) {
  revalidatePath(`/pacientes/${patientId}`, "layout");
  revalidatePath(`/pacientes/${patientId}/mapa`);
  revalidatePath("/inicio");
  revalidatePath("/", "layout");
}

async function context() {
  try {
    return await getActionContext();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

/** Crea un registro de dolor (una "foto" del dolor de una zona). El historial nunca se pisa. */
export async function createPainRecord(_prev: PainFormState, formData: FormData): Promise<PainFormState> {
  const ctx = await context();
  if (!ctx) return { ok: false, message: SESSION_EXPIRED };
  const { supabase, userId } = ctx;

  const intensityRaw = numberOrNull(formData, "intensity");
  const parsed = painRecordSchema.safeParse({
    patient_id: formText(formData, "patient_id") ?? "",
    region: formText(formData, "region") ?? "",
    view: formText(formData, "view") ?? "",
    intensity: intensityRaw ?? undefined,
    pain_types: [...new Set(formList(formData, "pain_types"))],
    frequency: formText(formData, "frequency"),
    status: formText(formData, "status") ?? "active",
    started_on: formText(formData, "started_on"),
    recorded_on: formText(formData, "recorded_on"),
    irradiation: formText(formData, "irradiation"),
    aggravating_factors: formText(formData, "aggravating_factors"),
    relieving_factors: formText(formData, "relieving_factors"),
    notes: formText(formData, "notes"),
    session_id: formText(formData, "session_id"),
    point_x: numberOrNull(formData, "point_x"),
    point_y: numberOrNull(formData, "point_y"),
  });

  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error);
    const general = fieldErrors.patient_id ?? fieldErrors.region ?? fieldErrors.view ?? fieldErrors.point;
    return { ok: false, message: general ?? "Revisá los datos marcados.", fieldErrors };
  }
  const v = parsed.data;

  // Pertenencia: el paciente debe ser del profesional y la sesión, de ese paciente.
  const [patientRes, sessionRes] = await Promise.all([
    supabase.from("patients").select("id").eq("id", v.patient_id).eq("professional_id", userId).maybeSingle(),
    v.session_id
      ? supabase.from("treatment_sessions").select("id").eq("id", v.session_id).eq("patient_id", v.patient_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (patientRes.error) return { ok: false, message: friendlyDbError(patientRes.error, "No pudimos verificar el paciente.") };
  if (!patientRes.data) return { ok: false, message: "No encontramos a este paciente." };
  if (v.session_id && !sessionRes.data) {
    return {
      ok: false,
      message: "Revisá los datos marcados.",
      fieldErrors: { session_id: "Esa sesión no pertenece a este paciente." },
    };
  }

  const today = todayISO();
  const { data, error } = await supabase
    .from("pain_records")
    .insert({
      patient_id: v.patient_id,
      region: v.region,
      view: v.view,
      intensity: v.intensity,
      pain_types: v.pain_types,
      frequency: v.frequency,
      status: v.status,
      started_on: v.started_on,
      irradiation: v.irradiation,
      aggravating_factors: v.aggravating_factors,
      relieving_factors: v.relieving_factors,
      notes: v.notes,
      session_id: v.session_id,
      point_x: v.point_x,
      point_y: v.point_y,
      // Registros cargados con fecha pasada (p. ej. evaluaciones en papel): mediodía de ese día en AR.
      ...(v.recorded_on && v.recorded_on < today ? { recorded_at: `${v.recorded_on}T12:00:00-03:00` } : {}),
    })
    .select(PAIN_RECORD_COLUMNS)
    .single();

  if (error || !data) {
    return { ok: false, message: friendlyDbError(error ?? {}, "No pudimos guardar el registro. Probá de nuevo en unos segundos.") };
  }

  revalidatePatient(v.patient_id);
  return { ok: true, message: "Registro guardado", data: { record: data } };
}

/** "Marcar como resuelto": agrega un registro con EVA 0 y estado resuelto (el historial se conserva). */
export async function markRegionResolved(patientId: string, region: string): Promise<PainFormState> {
  const ctx = await context();
  if (!ctx) return { ok: false, message: SESSION_EXPIRED };
  const { supabase, userId } = ctx;

  const zone = getRegion(region);
  if (!isUuid(patientId) || !zone) return { ok: false, message: "Datos inválidos." };

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("professional_id", userId)
    .maybeSingle();
  if (patientError) return { ok: false, message: friendlyDbError(patientError, "No pudimos verificar el paciente.") };
  if (!patient) return { ok: false, message: "No encontramos a este paciente." };

  const { data, error } = await supabase
    .from("pain_records")
    .insert({
      patient_id: patientId,
      region: zone.id,
      view: zone.view,
      intensity: 0,
      pain_types: [],
      status: "resolved",
      notes: "Marcado como resuelto",
    })
    .select(PAIN_RECORD_COLUMNS)
    .single();

  if (error || !data) {
    return { ok: false, message: friendlyDbError(error ?? {}, "No pudimos actualizar la zona. Probá de nuevo.") };
  }

  revalidatePatient(patientId);
  return { ok: true, message: `${zone.short}: marcado como resuelto`, data: { record: data } };
}

/** Borra un registro (solo para corregir errores de carga). */
export async function deletePainRecord(recordId: string, patientId: string): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return { ok: false, message: SESSION_EXPIRED };
  const { supabase, userId } = ctx;

  if (!isUuid(recordId) || !isUuid(patientId)) return { ok: false, message: "Datos inválidos." };

  const { data, error } = await supabase
    .from("pain_records")
    .delete()
    .eq("id", recordId)
    .eq("patient_id", patientId)
    .eq("professional_id", userId)
    .select("id");

  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos eliminar el registro. Probá de nuevo.") };
  if (!data?.length) return { ok: false, message: "No encontramos ese registro (puede que ya se haya eliminado)." };

  revalidatePatient(patientId);
  return { ok: true, message: "Registro eliminado" };
}
