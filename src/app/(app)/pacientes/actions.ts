"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/auth";
import { PATIENT_FILES_BUCKET } from "@/lib/constants";
import { safeNextPath } from "@/lib/routes";
import type { ActionState, PatientStatus } from "@/lib/types";
import { isUuid, todayISO } from "@/lib/utils";
import { parsePatientForm } from "@/components/patients/patient-schema";

type DbError = { code?: string; message: string; details?: string | null };

const DUPLICATE_DOCUMENT = "Ya tenés un paciente con ese documento.";
const SESSION_EXPIRED = "Tu sesión expiró. Volvé a ingresar para guardar.";
const INVALID_PATIENT = "No pudimos identificar al paciente. Recargá la página e intentá de nuevo.";
const PATIENT_NOT_FOUND = "No encontramos a este paciente. Puede que se haya eliminado.";

/**
 * Contexto de la acción o null si la sesión expiró. Las acciones nunca lanzan por una
 * condición esperable: devuelven un ActionState para que el formulario no se pierda.
 */
async function contextOrNull() {
  try {
    return await getActionContext();
  } catch {
    return null;
  }
}

/** Traduce errores de Postgres/PostgREST a mensajes en español. */
function dbErrorState(error: DbError, fallback: string): ActionState {
  switch (error.code) {
    case "23505":
      return { ok: false, message: DUPLICATE_DOCUMENT, fieldErrors: { document_number: DUPLICATE_DOCUMENT } };
    case "23514":
    case "22001":
    case "22007":
    case "22008":
    case "22P02":
      return { ok: false, message: "Algún dato no tiene un formato válido. Revisalo y probá de nuevo." };
    case "42501":
      return { ok: false, message: "No tenés permiso para hacer esto. Volvé a ingresar a tu cuenta." };
    case "PGRST301":
    case "PGRST303":
      return { ok: false, message: SESSION_EXPIRED };
    default:
      console.error("[pacientes]", error.code, error.message);
      return { ok: false, message: fallback };
  }
}

/** Revalida el listado, todas las pestañas del paciente y el layout (sidebar: recientes y conteo). */
function revalidatePatient(patientId?: string) {
  revalidatePath("/pacientes");
  if (patientId) revalidatePath(`/pacientes/${patientId}`, "layout");
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Alta y edición
// ---------------------------------------------------------------------------
export async function createPatient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await contextOrNull();
  if (!ctx) return { ok: false, message: SESSION_EXPIRED };
  const { supabase } = ctx;

  const parsed = parsePatientForm(formData, todayISO());
  if (!parsed.ok) {
    return { ok: false, message: "Revisá los campos marcados.", fieldErrors: parsed.fieldErrors };
  }

  const { data, error } = await supabase.from("patients").insert(parsed.data).select("id").single();
  if (error || !data) {
    return dbErrorState(error ?? { message: "sin datos" }, "No pudimos guardar el paciente. Probá de nuevo.");
  }

  revalidatePatient(data.id);
  redirect(`/pacientes/${data.id}?nuevo=1`);
}

export async function updatePatient(patientId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await contextOrNull();
  if (!ctx) return { ok: false, message: SESSION_EXPIRED };
  const { supabase } = ctx;
  if (!isUuid(patientId)) return { ok: false, message: INVALID_PATIENT };

  const parsed = parsePatientForm(formData, todayISO());
  if (!parsed.ok) {
    return { ok: false, message: "Revisá los campos marcados.", fieldErrors: parsed.fieldErrors };
  }

  const { data, error } = await supabase
    .from("patients")
    .update(parsed.data)
    .eq("id", patientId)
    .select("id")
    .maybeSingle();
  if (error) return dbErrorState(error, "No pudimos guardar los cambios. Probá de nuevo.");
  if (!data) return { ok: false, message: PATIENT_NOT_FOUND };

  revalidatePatient(patientId);
  redirect(`/pacientes/${patientId}?editado=1`);
}

// ---------------------------------------------------------------------------
// Estado (en tratamiento / alta / archivado)
// ---------------------------------------------------------------------------
const STATUS_MESSAGES: Record<PatientStatus, string> = {
  active: "El paciente volvió a estar en tratamiento.",
  discharged: "Le diste el alta al paciente.",
  archived: "Paciente archivado. Lo encontrás filtrando por Archivado.",
};

/**
 * Cambia el estado del paciente.
 * - `active`: reactiva el tratamiento (borra el alta y el archivo).
 * - `discharged`: registra el alta hoy.
 * - `archived`: lo archiva conservando la fecha de alta, si la tenía (ver `unarchivePatient`).
 */
export async function setPatientStatus(patientId: string, status: PatientStatus): Promise<ActionState> {
  const ctx = await contextOrNull();
  if (!ctx) return { ok: false, message: SESSION_EXPIRED };
  const { supabase } = ctx;
  if (!isUuid(patientId)) return { ok: false, message: INVALID_PATIENT };
  if (status !== "active" && status !== "discharged" && status !== "archived") {
    return { ok: false, message: "Ese estado no es válido. Recargá la página e intentá de nuevo." };
  }

  const now = new Date().toISOString();
  const changes =
    status === "active"
      ? { status, discharged_at: null, archived_at: null }
      : status === "discharged"
        ? { status, discharged_at: now, archived_at: null }
        : { status, archived_at: now };

  const { data, error } = await supabase.from("patients").update(changes).eq("id", patientId).select("id").maybeSingle();
  if (error) return dbErrorState(error, "No pudimos actualizar el estado. Probá de nuevo.");
  if (!data) return { ok: false, message: PATIENT_NOT_FOUND };

  revalidatePatient(patientId);
  return { ok: true, message: STATUS_MESSAGES[status] };
}

/**
 * Desarchiva al paciente devolviéndolo al estado que tenía: si tenía alta (`discharged_at`)
 * vuelve a "Alta" conservando esa fecha; si no, vuelve a "En tratamiento".
 */
export async function unarchivePatient(patientId: string): Promise<ActionState> {
  const ctx = await contextOrNull();
  if (!ctx) return { ok: false, message: SESSION_EXPIRED };
  const { supabase } = ctx;
  if (!isUuid(patientId)) return { ok: false, message: INVALID_PATIENT };

  const { data: current, error: findError } = await supabase
    .from("patients")
    .select("id, status, discharged_at")
    .eq("id", patientId)
    .maybeSingle();
  if (findError) return dbErrorState(findError, "No pudimos desarchivar al paciente. Probá de nuevo.");
  if (!current) return { ok: false, message: PATIENT_NOT_FOUND };
  if (current.status !== "archived") {
    revalidatePatient(patientId);
    return { ok: true, message: "El paciente ya no estaba archivado." };
  }

  const nextStatus: PatientStatus = current.discharged_at ? "discharged" : "active";
  const { data, error } = await supabase
    .from("patients")
    .update({ status: nextStatus, archived_at: null })
    .eq("id", patientId)
    .select("id")
    .maybeSingle();
  if (error) return dbErrorState(error, "No pudimos desarchivar al paciente. Probá de nuevo.");
  if (!data) return { ok: false, message: PATIENT_NOT_FOUND };

  revalidatePatient(patientId);
  return {
    ok: true,
    message:
      nextStatus === "discharged"
        ? "Paciente desarchivado. Sigue con el alta que tenía."
        : "Paciente desarchivado. Volvió a estar en tratamiento.",
  };
}

// ---------------------------------------------------------------------------
// Eliminación definitiva
// ---------------------------------------------------------------------------
const STORAGE_PAGE = 100;
const MAX_STORAGE_ROUNDS = 100;

type Bucket = ReturnType<Awaited<ReturnType<typeof getActionContext>>["supabase"]["storage"]["from"]>;

/**
 * Limpieza de Storage tras borrar la fila (mejor esfuerzo): un archivo privado huérfano es
 * inofensivo, mientras que un estudio que apunta a un archivo inexistente es un dato clínico
 * corrupto. Por eso nunca devuelve error: solo registra lo que no pudo borrar.
 */
async function removePatientFiles(bucket: Bucket, prefix: string, referenced: string[]) {
  if (referenced.length > 0) {
    const { error } = await bucket.remove(referenced);
    if (error) console.error("[pacientes] storage remove (referenciados)", prefix, error.message);
  }

  // Vaciar la carpeta del paciente (incluye subcarpetas). Se lista siempre desde el inicio
  // porque cada tanda borrada corre el offset.
  const folders = [prefix];
  let rounds = 0;
  while (folders.length > 0) {
    const folder = folders[folders.length - 1];
    if (++rounds > MAX_STORAGE_ROUNDS) {
      console.error("[pacientes] storage: demasiadas tandas, quedan archivos huérfanos en", prefix);
      return;
    }
    const { data: entries, error: listError } = await bucket.list(folder, { limit: STORAGE_PAGE, offset: 0 });
    if (listError) {
      console.error("[pacientes] storage list", folder, listError.message);
      return;
    }
    const files = (entries ?? []).filter((e) => e.id !== null && e.name !== ".emptyFolderPlaceholder");
    const subfolders = (entries ?? []).filter((e) => e.id === null).map((e) => `${folder}/${e.name}`);
    const placeholders = (entries ?? []).filter((e) => e.name === ".emptyFolderPlaceholder");

    if (files.length === 0 && subfolders.length === 0) {
      if (placeholders.length > 0) await bucket.remove(placeholders.map((e) => `${folder}/${e.name}`));
      folders.pop();
      continue;
    }
    if (files.length > 0) {
      const { error: removeError } = await bucket.remove(files.map((e) => `${folder}/${e.name}`));
      if (removeError) {
        console.error("[pacientes] storage remove", folder, removeError.message);
        return;
      }
    } else {
      // Solo quedan subcarpetas: entrar en ellas antes de volver a esta.
      folders.push(...subfolders);
    }
  }
}

/**
 * Elimina el paciente y todo lo asociado. Primero borra la fila (las FKs en cascada borran
 * historia clínica, sesiones, registros de dolor y estudios; el trigger de auditoría conserva
 * una copia para la custodia legal) y recién después, como limpieza de mejor esfuerzo, sus
 * archivos de Storage (`{userId}/{patientId}/…`). Redirige a `returnTo` (solo rutas de /pacientes).
 */
export async function deletePatient(patientId: string, returnTo?: string): Promise<ActionState> {
  const ctx = await contextOrNull();
  if (!ctx) return { ok: false, message: SESSION_EXPIRED };
  const { supabase, userId } = ctx;
  if (!isUuid(patientId)) return { ok: false, message: INVALID_PATIENT };

  const { data: patient, error: findError } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .maybeSingle();
  if (findError) return dbErrorState(findError, "No pudimos eliminar al paciente. Probá de nuevo.");
  if (!patient) return { ok: false, message: "No encontramos a este paciente. Puede que ya se haya eliminado." };

  // Rutas de los archivos referenciados por estudios: hay que leerlas antes de que la cascada
  // borre las filas de patient_studies (por si alguno quedó fuera de la carpeta esperada).
  const { data: studies, error: studiesError } = await supabase
    .from("patient_studies")
    .select("file_path")
    .eq("patient_id", patientId);
  if (studiesError) return dbErrorState(studiesError, "No pudimos eliminar al paciente. Probá de nuevo.");
  const referenced = (studies ?? [])
    .map((s) => s.file_path)
    .filter((p): p is string => typeof p === "string" && p.startsWith(`${userId}/`));

  const { data: deleted, error: deleteError } = await supabase
    .from("patients")
    .delete()
    .eq("id", patientId)
    .select("id");
  if (deleteError) return dbErrorState(deleteError, "No pudimos eliminar al paciente. Probá de nuevo.");
  if (!deleted || deleted.length === 0) {
    return { ok: false, message: "No encontramos a este paciente. Puede que ya se haya eliminado." };
  }

  revalidatePatient(patientId);

  try {
    await removePatientFiles(supabase.storage.from(PATIENT_FILES_BUCKET), `${userId}/${patientId}`, referenced);
  } catch (err) {
    console.error("[pacientes] storage cleanup", err instanceof Error ? err.message : err);
  }

  const target = safeNextPath(returnTo, "/pacientes");
  const safeTarget =
    (target === "/pacientes" || target.startsWith("/pacientes?")) && !target.includes(patientId) ? target : "/pacientes";
  redirect(safeTarget);
}
