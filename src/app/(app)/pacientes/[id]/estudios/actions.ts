"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, PATIENT_FILES_BUCKET } from "@/lib/constants";
import type { ActionState } from "@/lib/types";
import { isUuid, todayISO } from "@/lib/utils";
import {
  STORAGE_FILE_NAME_RE,
  isAllowedMime,
  randomId,
  resolveMimeType,
  sanitizeFileName,
} from "@/components/studies/files";
import {
  studyFileSchema,
  studyMetaSchema,
  zodFieldErrors,
  type StudyFileChange,
  type StudyFileInput,
  type StudyMetaInput,
  type StudyUploadTicket,
} from "@/components/studies/schema";

type Supabase = Awaited<ReturnType<typeof getActionContext>>["supabase"];

/** Vigencia de las URLs firmadas para ver o descargar un archivo (se piden a demanda). */
const FILE_URL_TTL_SECONDS = 2 * 60;

const sessionExpired = <T = undefined>(): ActionState<T> => ({
  ok: false,
  message: "Tu sesión expiró. Volvé a ingresar para guardar.",
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

/** Tipo MIME tal como lo guardó Storage ("image/jpeg; charset=…" → "image/jpeg"). */
function normalizeMime(value: string | null | undefined): string | null {
  const type = value?.split(";")[0]?.trim().toLowerCase();
  return type || null;
}

/**
 * Valida un archivo subido desde el navegador: forma, que la ruta pertenezca al
 * profesional y al paciente, que el objeto exista realmente en Storage y que su tipo y
 * tamaño (los que observó Storage, no los que declara el cliente) sean admitidos.
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
  const { count, error: countError } = await supabase
    .from("patient_studies")
    .select("id", { count: "exact", head: true })
    .eq("file_path", file.path);
  if (countError) return { ok: false, message: "No pudimos verificar el archivo. Intentá de nuevo." };
  if (count) return { ok: false, message: "Ese archivo ya está asociado a otro estudio." };

  const storage = supabase.storage.from(PATIENT_FILES_BUCKET);
  try {
    const { data: info } = await storage.info(file.path);
    if (info) {
      const mime = normalizeMime(info.contentType) ?? file.mime_type;
      const size = typeof info.size === "number" ? info.size : file.size_bytes;
      if (!isAllowedMime(mime)) return { ok: false, message: "Formato de archivo no admitido." };
      if (size <= 0) return { ok: false, message: "El archivo está vacío." };
      if (size > MAX_UPLOAD_BYTES) return { ok: false, message: "El archivo supera el máximo permitido (20 MB)." };
      return { ok: true, file: { ...file, mime_type: mime, size_bytes: size } };
    }
    // Sin metadatos (p. ej. el endpoint de info no respondió): al menos confirmar que exista.
    const { data: exists } = await storage.exists(file.path);
    if (!exists) return { ok: false, message: "No encontramos el archivo subido. Probá subirlo de nuevo." };
  } catch (error) {
    console.error("verifyUploadedFile", error instanceof Error ? error.message : error);
    return { ok: false, message: "No pudimos verificar el archivo. Intentá de nuevo." };
  }
  return { ok: true, file };
}

/** Borra objetos de Storage (un reintento). Si falla, queda registrado para limpiarlo a mano. */
async function removeObjects(supabase: Supabase, paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length === 0) return;
  const storage = supabase.storage.from(PATIENT_FILES_BUCKET);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { error } = await storage.remove(list);
      if (!error) return;
      if (attempt === 1) console.error("removeObjects", error.name, error.message, list.length);
    } catch (error) {
      if (attempt === 1) console.error("removeObjects", error instanceof Error ? error.message : error);
    }
  }
}

function dbMessage(code: string | undefined, fallback: string): string {
  if (code === "23514") return "Hay un dato fuera de rango. Revisá el formulario.";
  if (code === "23503" || code === "42501") return "No tenés permiso para modificar los estudios de este paciente.";
  return fallback;
}

// ---------------------------------------------------------------------------
// Subida: URL firmada de un solo uso para subir directo a Storage desde el navegador
// ---------------------------------------------------------------------------
export async function createStudyUpload(
  patientId: string,
  file: { name: string; type: string; size: number },
): Promise<ActionState<StudyUploadTicket>> {
  const ctx = await context();
  if (!ctx) return { ok: false, message: "Tu sesión expiró. Volvé a ingresar para subir archivos." };
  const { supabase, userId } = ctx;

  if (!isUuid(patientId)) return { ok: false, message: "No encontramos al paciente." };
  const name = typeof file?.name === "string" ? file.name.trim().slice(0, 255) : "";
  const size = typeof file?.size === "number" ? file.size : NaN;
  const mime = name ? resolveMimeType({ name, type: typeof file?.type === "string" ? file.type : "" }) : null;
  if (!name || !mime) return { ok: false, message: "Formato de archivo no admitido." };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, message: "El archivo está vacío." };
  if (size > MAX_UPLOAD_BYTES) return { ok: false, message: "El archivo supera el máximo permitido (20 MB)." };

  try {
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .maybeSingle();
    if (patientError) return { ok: false, message: "No pudimos preparar la subida. Intentá de nuevo." };
    if (!patient) return { ok: false, message: "No encontramos al paciente." };

    const path = `${userId}/${patientId}/${randomId()}-${sanitizeFileName(name)}`;
    const { data, error } = await supabase.storage.from(PATIENT_FILES_BUCKET).createSignedUploadUrl(path);
    if (error || !data?.signedUrl) {
      console.error("createStudyUpload", error?.name, error?.message);
      return { ok: false, message: "No pudimos preparar la subida. Intentá de nuevo." };
    }
    return { ok: true, data: { path, uploadUrl: data.signedUrl, mime_type: mime } };
  } catch (error) {
    console.error("createStudyUpload", error instanceof Error ? error.message : error);
    return { ok: false, message: "No pudimos preparar la subida. Revisá tu conexión e intentá de nuevo." };
  }
}

/**
 * Descarta un archivo recién subido que no llegó a guardarse en un estudio (p. ej. falló la
 * validación). Nunca borra un archivo que ya pertenece a un estudio.
 */
export async function discardStudyUpload(path: string): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return sessionExpired();
  const { supabase, userId } = ctx;

  const prefix = `${userId}/`;
  if (typeof path !== "string" || !path.startsWith(prefix)) return { ok: false, message: "Archivo inválido." };
  const [patientId, fileName, ...rest] = path.slice(prefix.length).split("/");
  if (rest.length > 0 || !isUuid(patientId) || !STORAGE_FILE_NAME_RE.test(fileName ?? "")) {
    return { ok: false, message: "Archivo inválido." };
  }

  try {
    const { count, error } = await supabase
      .from("patient_studies")
      .select("id", { count: "exact", head: true })
      .eq("file_path", path);
    if (error || count) return { ok: false, message: "El archivo pertenece a un estudio." };
    await removeObjects(supabase, [path]);
    return { ok: true };
  } catch (error) {
    console.error("discardStudyUpload", error instanceof Error ? error.message : error);
    return { ok: false, message: "No pudimos descartar el archivo." };
  }
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

  try {
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .maybeSingle();
    if (patientError) return { ok: false, message: "No pudimos verificar al paciente. Intentá de nuevo." };
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
      console.error("createStudy", error?.code, error?.message);
      return { ok: false, message: dbMessage(error?.code, "No pudimos guardar el estudio. Intentá de nuevo.") };
    }

    revalidateStudies();
    return { ok: true, message: "Estudio agregado", data: { id: data.id } };
  } catch (error) {
    console.error("createStudy", error instanceof Error ? error.message : error);
    return { ok: false, message: "No pudimos guardar el estudio. Revisá tu conexión e intentá de nuevo." };
  }
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

  try {
    const { data: current, error: currentError } = await supabase
      .from("patient_studies")
      .select("id, patient_id, file_path")
      .eq("id", studyId)
      .maybeSingle();
    if (currentError) return { ok: false, message: "No pudimos cargar el estudio. Intentá de nuevo." };
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
      console.error("updateStudy", error?.code, error?.message);
      return { ok: false, message: dbMessage(error?.code, "No pudimos actualizar el estudio. Intentá de nuevo.") };
    }

    if (oldPathToRemove) await removeObjects(supabase, [oldPathToRemove]);

    revalidateStudies();
    return { ok: true, message: "Estudio actualizado" };
  } catch (error) {
    console.error("updateStudy", error instanceof Error ? error.message : error);
    return { ok: false, message: "No pudimos actualizar el estudio. Revisá tu conexión e intentá de nuevo." };
  }
}

// ---------------------------------------------------------------------------
// Eliminar (fila + archivo en Storage)
// ---------------------------------------------------------------------------
export async function deleteStudy(studyId: string): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return sessionExpired();
  const { supabase } = ctx;

  if (!isUuid(studyId)) return { ok: false, message: "No encontramos el estudio." };

  try {
    const { data: deleted, error } = await supabase
      .from("patient_studies")
      .delete()
      .eq("id", studyId)
      .select("id, file_path");

    if (error) {
      console.error("deleteStudy", error.code, error.message);
      return { ok: false, message: dbMessage(error.code, "No pudimos eliminar el estudio. Intentá de nuevo.") };
    }
    if (!deleted?.length) return { ok: false, message: "No encontramos el estudio." };

    await removeObjects(
      supabase,
      deleted.map((d) => d.file_path),
    );

    revalidateStudies();
    return { ok: true, message: "Estudio eliminado" };
  } catch (error) {
    console.error("deleteStudy", error instanceof Error ? error.message : error);
    return { ok: false, message: "No pudimos eliminar el estudio. Revisá tu conexión e intentá de nuevo." };
  }
}

// ---------------------------------------------------------------------------
// URL firmada a demanda (2 minutos) para ver o descargar el archivo
// ---------------------------------------------------------------------------
export async function getStudyFileUrl(
  studyId: string,
  mode: "view" | "download",
): Promise<ActionState<{ url: string }>> {
  const ctx = await context();
  if (!ctx) return { ok: false, message: "Tu sesión expiró. Volvé a ingresar para abrir el archivo." };
  const { supabase } = ctx;

  if (!isUuid(studyId)) return { ok: false, message: "No encontramos el estudio." };

  try {
    const { data: study, error: studyError } = await supabase
      .from("patient_studies")
      .select("file_path, file_name")
      .eq("id", studyId)
      .maybeSingle();
    if (studyError) return { ok: false, message: "No pudimos abrir el archivo. Intentá de nuevo." };
    if (!study?.file_path) return { ok: false, message: "Este estudio no tiene un archivo adjunto." };

    const { data, error } = await supabase.storage
      .from(PATIENT_FILES_BUCKET)
      .createSignedUrl(
        study.file_path,
        FILE_URL_TTL_SECONDS,
        mode === "download" ? { download: study.file_name || true } : undefined,
      );

    if (error || !data?.signedUrl) {
      console.error("getStudyFileUrl", error?.name, error?.message);
      return { ok: false, message: "No pudimos abrir el archivo. Intentá de nuevo." };
    }
    return { ok: true, data: { url: data.signedUrl } };
  } catch (error) {
    console.error("getStudyFileUrl", error instanceof Error ? error.message : error);
    return { ok: false, message: "No pudimos abrir el archivo. Revisá tu conexión e intentá de nuevo." };
  }
}
