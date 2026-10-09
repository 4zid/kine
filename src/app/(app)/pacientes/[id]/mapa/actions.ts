"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PAIN_RECORD_COLUMNS, type PainFormState } from "@/components/body-map/types";
import { getActionContext } from "@/lib/auth";
import { getRegion, isValidRegion } from "@/lib/body-regions";
import { PAIN_FREQUENCY, PAIN_TYPES } from "@/lib/constants";
import type { ActionState, BodyView, PainFrequency, PainStatus } from "@/lib/types";
import { formList, formText, isUuid, toISODate, todayISO } from "@/lib/utils";

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
    if (v.recorded_on && v.recorded_on < "1900-01-01") {
      ctx.addIssue({ code: "custom", path: ["recorded_on"], message: "Revisá la fecha." });
    }
    if (v.recorded_on && v.started_on && v.started_on > v.recorded_on) {
      ctx.addIssue({ code: "custom", path: ["started_on"], message: "No puede ser posterior a la fecha del registro." });
    }
  });

type PainRecordInput = z.infer<typeof painRecordSchema>;

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

/** Lee y valida el formulario del mapa. Devuelve los datos o el ActionState de error. */
function parsePainForm(formData: FormData): { data: PainRecordInput } | { error: PainFormState } {
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
    return { error: { ok: false, message: general ?? "Revisá los datos marcados.", fieldErrors } };
  }
  return { data: parsed.data };
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

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a ingresar para guardar.";

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

type Ctx = NonNullable<Awaited<ReturnType<typeof context>>>;

/** El paciente debe ser del profesional. Devuelve un ActionState de error o null si está todo bien. */
async function checkPatient({ supabase, userId }: Ctx, patientId: string): Promise<PainFormState | null> {
  const { data, error } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("professional_id", userId)
    .maybeSingle();
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos verificar el paciente. Probá de nuevo.") };
  if (!data) return { ok: false, message: "No encontramos a este paciente." };
  return null;
}

/**
 * Una sesión vinculable: del mismo paciente, realizada (asistió) y con fecha hasta hoy. Las sesiones
 * futuras no existen como evolución y las ausencias/cancelaciones no tienen evaluación que vincular.
 */
async function checkSession({ supabase }: Ctx, sessionId: string, patientId: string): Promise<PainFormState | null> {
  const { data, error } = await supabase
    .from("treatment_sessions")
    .select("id, session_date, attendance")
    .eq("id", sessionId)
    .eq("patient_id", patientId)
    .maybeSingle();
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos verificar la sesión. Probá de nuevo.") };
  const invalid = (message: string): PainFormState => ({
    ok: false,
    message: "Revisá los datos marcados.",
    fieldErrors: { session_id: message },
  });
  if (!data) return invalid("Esa sesión no pertenece a este paciente.");
  if (data.session_date > todayISO()) return invalid("No se puede vincular una sesión con fecha futura.");
  if (data.attendance !== "attended") return invalid("Solo se pueden vincular sesiones a las que el paciente asistió.");
  return null;
}

/** recorded_at para una fecha elegida: hoy = ahora; un día pasado = mediodía de ese día en AR. */
function recordedAtFor(day: string): string {
  return day >= todayISO() ? new Date().toISOString() : `${day}T12:00:00-03:00`;
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

/** Crea un registro de dolor (una "foto" del dolor de una zona). El historial nunca se pisa. */
export async function createPainRecord(_prev: PainFormState, formData: FormData): Promise<PainFormState> {
  const ctx = await context();
  if (!ctx) return { ok: false, message: SESSION_EXPIRED };

  const parsed = parsePainForm(formData);
  if ("error" in parsed) return parsed.error;
  const v = parsed.data;

  // Pertenencia: el paciente debe ser del profesional y la sesión, de ese paciente (y realizada).
  const [patientError, sessionError] = await Promise.all([
    checkPatient(ctx, v.patient_id),
    v.session_id ? checkSession(ctx, v.session_id, v.patient_id) : Promise.resolve(null),
  ]);
  if (patientError) return patientError;
  if (sessionError) return sessionError;

  const today = todayISO();
  const { data, error } = await ctx.supabase
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
      ...(v.recorded_on && v.recorded_on < today ? { recorded_at: recordedAtFor(v.recorded_on) } : {}),
    })
    .select(PAIN_RECORD_COLUMNS)
    .single();

  if (error || !data) {
    return { ok: false, message: friendlyDbError(error ?? {}, "No pudimos guardar el registro. Probá de nuevo en unos segundos.") };
  }

  revalidatePatient(v.patient_id);
  return { ok: true, message: "Registro guardado", data: { record: data } };
}

/**
 * Corrige un registro existente (errores de carga): misma validación que al crear. La zona no se
 * cambia. El trigger de auditoría guarda la versión anterior (custodia de la historia clínica).
 */
export async function updatePainRecord(_prev: PainFormState, formData: FormData): Promise<PainFormState> {
  const ctx = await context();
  if (!ctx) return { ok: false, message: SESSION_EXPIRED };
  const { supabase, userId } = ctx;

  const recordId = formText(formData, "record_id");
  if (!isUuid(recordId)) return { ok: false, message: "Registro inválido. Recargá la página." };

  const parsed = parsePainForm(formData);
  if ("error" in parsed) return parsed.error;
  const v = parsed.data;

  const { data: existing, error: existingError } = await supabase
    .from("pain_records")
    .select("id, region, view, recorded_at, session_id")
    .eq("id", recordId)
    .eq("patient_id", v.patient_id)
    .eq("professional_id", userId)
    .maybeSingle();
  if (existingError) {
    return { ok: false, message: friendlyDbError(existingError, "No pudimos leer el registro. Probá de nuevo.") };
  }
  if (!existing) return { ok: false, message: "No encontramos ese registro (puede que se haya eliminado). Recargá la página." };
  if (existing.region !== v.region || existing.view !== v.view) {
    return { ok: false, message: "El registro es de otra zona. Recargá la página." };
  }

  // Solo se valida la sesión si cambió (un vínculo viejo se conserva tal cual).
  if (v.session_id && v.session_id !== existing.session_id) {
    const sessionError = await checkSession(ctx, v.session_id, v.patient_id);
    if (sessionError) return sessionError;
  }

  const currentDay = toISODate(new Date(existing.recorded_at));
  const { data, error } = await supabase
    .from("pain_records")
    .update({
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
      ...(v.recorded_on && v.recorded_on !== currentDay ? { recorded_at: recordedAtFor(v.recorded_on) } : {}),
    })
    .eq("id", recordId)
    .eq("patient_id", v.patient_id)
    .eq("professional_id", userId)
    .select(PAIN_RECORD_COLUMNS)
    .maybeSingle();

  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos guardar los cambios. Probá de nuevo en unos segundos.") };
  if (!data) return { ok: false, message: "No encontramos ese registro (puede que se haya eliminado). Recargá la página." };

  revalidatePatient(v.patient_id);
  return { ok: true, message: "Registro actualizado", data: { record: data } };
}

/**
 * "Marcar como resuelto": agrega un registro con EVA 0 y estado resuelto (el historial se conserva).
 * Conserva la caracterización del último registro (tipo, frecuencia, inicio, irradiación,
 * factores) y, si se indica, lo vincula a la sesión de hoy.
 */
export async function markRegionResolved(
  patientId: string,
  region: string,
  sessionId?: string | null,
): Promise<PainFormState> {
  const ctx = await context();
  if (!ctx) return { ok: false, message: SESSION_EXPIRED };
  const { supabase } = ctx;

  const zone = getRegion(region);
  if (!isUuid(patientId) || !zone) return { ok: false, message: "Datos inválidos." };

  const [patientError, latestRes, sessionError] = await Promise.all([
    checkPatient(ctx, patientId),
    supabase
      .from("pain_records")
      .select("pain_types, frequency, started_on, irradiation, aggravating_factors, relieving_factors")
      .eq("patient_id", patientId)
      .eq("region", zone.id)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // La sesión es opcional: si no es vinculable (otra fecha, ausente…), se resuelve sin vínculo.
    isUuid(sessionId) ? checkSession(ctx, sessionId, patientId) : Promise.resolve(null),
  ]);
  if (patientError) return patientError;
  if (latestRes.error) {
    return { ok: false, message: friendlyDbError(latestRes.error, "No pudimos leer la zona. Probá de nuevo.") };
  }
  const prev = latestRes.data;
  const linkSession = isUuid(sessionId) && !sessionError ? sessionId : null;

  const { data, error } = await supabase
    .from("pain_records")
    .insert({
      patient_id: patientId,
      region: zone.id,
      view: zone.view,
      intensity: 0,
      status: "resolved",
      pain_types: prev?.pain_types ?? [],
      frequency: prev?.frequency ?? null,
      started_on: prev?.started_on ?? null,
      irradiation: prev?.irradiation ?? null,
      aggravating_factors: prev?.aggravating_factors ?? null,
      relieving_factors: prev?.relieving_factors ?? null,
      session_id: linkSession,
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

/** Borra un registro (solo para corregir errores de carga; la auditoría conserva una copia). */
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
