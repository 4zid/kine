"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth";
import { PATIENT_FILES_BUCKET } from "@/lib/constants";
import type { ActionState } from "@/lib/types";
import { isUuid, todayISO } from "@/lib/utils";
import { STORAGE_FILE_NAME_RE } from "@/components/studies/files";
import {
  studyFileSchema,
  studyMetaSchema,
  zodFieldErrors,
  type StudyFileChange,
  type StudyFileInput,
  type StudyMetaInput,
} from "@/components/studies/schema";

type Supabase = Awaited<ReturnType<typeof getActionContext>>["supabase"];

const sessionExpired = <T = undefined>(): ActionState<T> => ({
  ok: false,
  message: "Tu sesión expiró. Volvé a ingresar.",
});

async function context() {
  try {
    return await getActionContext();
  } catch {
    return null;
  }
}

function revalidateStudies() {
  // El resumen / encabezado del paciente pueden mostrar estudios recientes.
  revalidatePath("/pacientes/[id]", "layout");
}

/**
 * Valida un archivo subido desde el navegador: forma, que la ruta pertenezca al
 * profesional y al paciente, y que el objeto exista realmente en Storage.
 */
async function verifyUploadedFile(
  supabase: Supabase,
  userId: string,
  patientId: string,
  raw: StudyFileInput,
): Promise<{ ok: true; file: ReturnType<typeof studyFileSchema.parse> } | { ok: false; message: string }> {
  const parsed = studyFileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Archivo inválido." };
  const file = parsed.data;
  const prefix = `${userId}/${patientId}/`;
  if (!file.path.startsWith(prefix) || !STORAGE_FILE_NAME_RE.test(file.path.slice(prefix.length))) {
    return { ok: false, message: "La ubicación del archivo no es válida." };
  }
  // Un objeto pertenece a un solo estudio (si no, borrar uno rompería el otro).
  const { count } = await supabase
    .from("patient_studies")
    .select("id", { count: "exact", head: true })
    .eq("file_path", file.path);
  if (count) return { ok: false, message: "Ese archivo ya está asociado a otro estudio." };
  try {
    const { data: exists } = await supabase.storage.from(PATIENT_FILES_BUCKET).exists(file.path);
    if (!exists) return { ok: false, message: "No encontramos el archivo subido. Probá subirlo de nuevo." };
  } catch (error) {
    console.error("verifyUploadedFile", error);
    return { ok: false, message: "No pudimos verificar el archivo. Intentá de nuevo." };
  }
  return { ok: true, file };
}

async function removeObjects(supabase: Supabase, paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length === 0) return;
  const { error } = await supabase.storage.from(PATIENT_FILES_BUCKET).remove(list);
  if (error) console.error("removeObjects", error);
}

function dbMessage(code: string | undefined, fallback: string): string {
  if (code === "23514") return "Hay un dato fuera de rango. Revisá el formulario.";
  if (code === "23503" || code === "42501") return "No tenés permiso para modificar los estudios de este paciente.";
  return fallback;
}

// ---------------------------------------------------------------------------
// Crear
// ---------------------------------------------------------------------------
export async function createStudy(
  patientId: string,
  meta: StudyMetaInput,
  file: StudyFileInput | null,
): Promise<ActionState<{ id: string }>> {
  const ctx = await context();
  if (!ctx) return sessionExpired();
  const { supabase, userId } = ctx;

  if (!isUuid(patientId)) return { ok: false, message: "No encontramos al paciente." };

  const parsed = studyMetaSchema(todayISO()).safeParse(meta);
  if (!parsed.success) {
    return { ok: false, message: "Revisá los campos marcados.", fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const { data: patient } = await supabase.from("patients").select("id").eq("id", patientId).maybeSingle();
  if (!patient) return { ok: false, message: "No encontramos al paciente." };

  let fileColumns = {
    file_path: null as string | null,
    file_name: null as string | null,
    mime_type: null as string | null,
    size_bytes: null as number | null,
  };
  if (file) {
    const checked = await verifyUploadedFile(supabase, userId, patientId, file);
    if (!checked.ok) return { ok: false, message: checked.message, fieldErrors: { file: checked.message } };
    fileColumns = {
      file_path: checked.file.path,
      file_name: checked.file.name,
      mime_type: checked.file.mime_type,
      size_bytes: checked.file.size_bytes,
    };
  }

  const { data, error } = await supabase
    .from("patient_studies")
    .insert({ patient_id: patientId, ...parsed.data, ...fileColumns })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createStudy", error);
    return { ok: false, message: dbMessage(error?.code, "No pudimos guardar el estudio. Intentá de nuevo.") };
  }

  revalidateStudies();
  return { ok: true, message: "Estudio agregado", data: { id: data.id } };
}

// ---------------------------------------------------------------------------
// Editar (metadatos y, opcionalmente, reemplazar o quitar el archivo)
// ---------------------------------------------------------------------------
export async function updateStudy(
  studyId: string,
  meta: StudyMetaInput,
  change: StudyFileChange,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return sessionExpired();
  const { supabase, userId } = ctx;

  if (!isUuid(studyId)) return { ok: false, message: "No encontramos el estudio." };

  const parsed = studyMetaSchema(todayISO()).safeParse(meta);
  if (!parsed.success) {
    return { ok: false, message: "Revisá los campos marcados.", fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const { data: current } = await supabase
    .from("patient_studies")
    .select("id, patient_id, file_path")
    .eq("id", studyId)
    .maybeSingle();
  if (!current) return { ok: false, message: "No encontramos el estudio." };

  const mode = change && typeof change === "object" ? change.mode : "keep";
  let fileColumns: Record<string, string | number | null> = {};
  let oldPathToRemove: string | null = null;

  if (mode === "replace" && "file" in change) {
    const checked = await verifyUploadedFile(supabase, userId, current.patient_id, change.file);
    if (!checked.ok) return { ok: false, message: checked.message, fieldErrors: { file: checked.message } };
    fileColumns = {
      file_path: checked.file.path,
      file_name: checked.file.name,
      mime_type: checked.file.mime_type,
      size_bytes: checked.file.size_bytes,
    };
    oldPathToRemove = current.file_path;
  } else if (mode === "remove") {
    fileColumns = { file_path: null, file_name: null, mime_type: null, size_bytes: null };
    oldPathToRemove = current.file_path;
  } else if (mode !== "keep") {
    return { ok: false, message: "Acción de archivo inválida." };
  }

  const { data: updated, error } = await supabase
    .from("patient_studies")
    .update({ ...parsed.data, ...fileColumns })
    .eq("id", studyId)
    .select("id");

  if (error || !updated?.length) {
    console.error("updateStudy", error);
    return { ok: false, message: dbMessage(error?.code, "No pudimos actualizar el estudio. Intentá de nuevo.") };
  }

  if (oldPathToRemove) await removeObjects(supabase, [oldPathToRemove]);

  revalidateStudies();
  return { ok: true, message: "Estudio actualizado" };
}

// ---------------------------------------------------------------------------
// Eliminar (fila + archivo en Storage)
// ---------------------------------------------------------------------------
export async function deleteStudy(studyId: string): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return sessionExpired();
  const { supabase } = ctx;

  if (!isUuid(studyId)) return { ok: false, message: "No encontramos el estudio." };

  const { data: deleted, error } = await supabase
    .from("patient_studies")
    .delete()
    .eq("id", studyId)
    .select("id, file_path");

  if (error) {
    console.error("deleteStudy", error);
    return { ok: false, message: dbMessage(error.code, "No pudimos eliminar el estudio. Intentá de nuevo.") };
  }
  if (!deleted?.length) return { ok: false, message: "No encontramos el estudio." };

  await removeObjects(
    supabase,
    deleted.map((d) => d.file_path),
  );

  revalidateStudies();
  return { ok: true, message: "Estudio eliminado" };
}

// ---------------------------------------------------------------------------
// URL firmada a demanda (5 minutos) para ver o descargar el archivo
// ---------------------------------------------------------------------------
export async function getStudyFileUrl(
  studyId: string,
  mode: "view" | "download",
): Promise<ActionState<{ url: string }>> {
  const ctx = await context();
  if (!ctx) return sessionExpired();
  const { supabase } = ctx;

  if (!isUuid(studyId)) return { ok: false, message: "No encontramos el estudio." };

  const { data: study } = await supabase
    .from("patient_studies")
    .select("file_path, file_name")
    .eq("id", studyId)
    .maybeSingle();
  if (!study?.file_path) return { ok: false, message: "Este estudio no tiene un archivo adjunto." };

  const { data, error } = await supabase.storage
    .from(PATIENT_FILES_BUCKET)
    .createSignedUrl(study.file_path, 300, mode === "download" ? { download: study.file_name || true } : undefined);

  if (error || !data?.signedUrl) {
    console.error("getStudyFileUrl", error);
    return { ok: false, message: "No pudimos abrir el archivo. Intentá de nuevo." };
  }
  return { ok: true, data: { url: data.signedUrl } };
}
