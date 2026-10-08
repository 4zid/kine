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
      return { ok: false, message: "Tu sesión expiró. Volvé a ingresar." };
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
  const { supabase } = await getActionContext();

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
  const { supabase } = await getActionContext();
  if (!isUuid(patientId)) return { ok: false, message: "Paciente inválido." };

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
  if (!data) return { ok: false, message: "No encontramos este paciente. Puede que se haya eliminado." };

  revalidatePatient(patientId);
  redirect(`/pacientes/${patientId}?editado=1`);
}

// ---------------------------------------------------------------------------
// Estado (en tratamiento / alta / archivado)
// ---------------------------------------------------------------------------
const STATUS_MESSAGES: Record<PatientStatus, string> = {
  active: "El paciente volvió a En tratamiento.",
  discharged: "Le diste el alta al paciente.",
  archived: "Paciente archivado. Lo encontrás en Archivados.",
};

export async function setPatientStatus(patientId: string, status: PatientStatus): Promise<ActionState> {
  const { supabase } = await getActionContext();
  if (!isUuid(patientId)) return { ok: false, message: "Paciente inválido." };
  if (status !== "active" && status !== "discharged" && status !== "archived") {
    return { ok: false, message: "Estado inválido." };
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
  if (!data) return { ok: false, message: "No encontramos este paciente." };

  revalidatePatient(patientId);
  return { ok: true, message: STATUS_MESSAGES[status] };
}

// ---------------------------------------------------------------------------
// Eliminación definitiva
// ---------------------------------------------------------------------------
const STORAGE_PAGE = 100;
const MAX_STORAGE_ROUNDS = 100;

/**
 * Elimina el paciente y todo lo asociado. Primero borra sus archivos de Storage
 * (`{userId}/{patientId}/…`), después la fila: las FKs en cascada borran historia clínica,
 * sesiones, registros de dolor y estudios. Redirige a `returnTo` (solo rutas de /pacientes).
 */
export async function deletePatient(patientId: string, returnTo?: string): Promise<ActionState> {
  const { supabase, userId } = await getActionContext();
  if (!isUuid(patientId)) return { ok: false, message: "Paciente inválido." };

  const { data: patient, error: findError } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .maybeSingle();
  if (findError) return dbErrorState(findError, "No pudimos eliminar el paciente. Probá de nuevo.");
  if (!patient) return { ok: false, message: "No encontramos este paciente. Puede que ya se haya eliminado." };

  const bucket = supabase.storage.from(PATIENT_FILES_BUCKET);
  const prefix = `${userId}/${patientId}`;

  // Archivos referenciados por estudios (por si alguno quedó fuera de la carpeta esperada).
  const { data: studies } = await supabase.from("patient_studies").select("file_path").eq("patient_id", patientId);
  const referenced = (studies ?? [])
    .map((s) => s.file_path)
    .filter((p): p is string => Boolean(p) && (p as string).startsWith(`${userId}/`));
  if (referenced.length > 0) {
    const { error } = await bucket.remove(referenced);
    if (error) {
      console.error("[pacientes] storage remove", error.message);
      return { ok: false, message: "No pudimos borrar los archivos del paciente. Probá de nuevo." };
    }
  }

  // Vaciar la carpeta del paciente (incluye subcarpetas). Se lista siempre desde el inicio
  // porque cada tanda borrada corre el offset.
  const folders = [prefix];
  let rounds = 0;
  while (folders.length > 0) {
    const folder = folders[folders.length - 1];
    if (++rounds > MAX_STORAGE_ROUNDS) {
      return { ok: false, message: "El paciente tiene demasiados archivos para borrar de una vez. Probá de nuevo." };
    }
    const { data: entries, error: listError } = await bucket.list(folder, { limit: STORAGE_PAGE, offset: 0 });
    if (listError) {
      console.error("[pacientes] storage list", listError.message);
      return { ok: false, message: "No pudimos borrar los archivos del paciente. Probá de nuevo." };
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
        console.error("[pacientes] storage remove", removeError.message);
        return { ok: false, message: "No pudimos borrar los archivos del paciente. Probá de nuevo." };
      }
    }
    if (files.length === 0) {
      // Solo quedan subcarpetas: entrar en ellas antes de volver a esta.
      folders.push(...subfolders);
    }
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("patients")
    .delete()
    .eq("id", patientId)
    .select("id");
  if (deleteError) return dbErrorState(deleteError, "No pudimos eliminar el paciente. Probá de nuevo.");
  if (!deleted || deleted.length === 0) return { ok: false, message: "No encontramos este paciente." };

  revalidatePatient(patientId);

  const target = safeNextPath(returnTo, "/pacientes");
  const safeTarget =
    (target === "/pacientes" || target.startsWith("/pacientes?")) && !target.includes(patientId) ? target : "/pacientes";
  redirect(safeTarget);
}
