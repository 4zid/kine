import { createClient } from "@/lib/supabase/client";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { PATIENT_FILES_BUCKET } from "@/lib/constants";
import { randomId, resolveMimeType, sanitizeFileName } from "@/components/studies/files";
import type { StudyFileInput } from "@/components/studies/schema";

/**
 * Subida directa del navegador a Storage (bucket privado "patient-files").
 * Se usa XMLHttpRequest para informar el progreso real; la RLS de Storage exige
 * que el primer segmento de la ruta sea el uid del profesional.
 */
export class UploadError extends Error {
  constructor(
    message: string,
    readonly aborted = false,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export type UploadParams = {
  file: File;
  userId: string;
  patientId: string;
  /** 0..1 */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

export type UploadFn = (params: UploadParams) => Promise<StudyFileInput>;
export type RemoveFn = (path: string) => Promise<void>;

function messageFor(status: number, body: string): string {
  const text = body.toLowerCase();
  if (status === 413 || text.includes("maximum allowed size") || text.includes("too large")) {
    return "El archivo supera el máximo permitido (20 MB).";
  }
  if (text.includes("mime") || status === 415) return "Formato de archivo no admitido.";
  if (status === 401 || status === 403 || text.includes("row-level security")) {
    return "No tenés permiso para subir este archivo. Volvé a ingresar e intentá de nuevo.";
  }
  if (status === 409) return "Ya existe un archivo con ese nombre. Intentá de nuevo.";
  return "No pudimos subir el archivo. Intentá de nuevo.";
}

export const uploadStudyFile: UploadFn = async ({ file, userId, patientId, onProgress, signal }) => {
  const mime = resolveMimeType(file);
  if (!mime) throw new UploadError("Formato de archivo no admitido.");

  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new UploadError("Tu sesión expiró. Volvé a ingresar para subir archivos.");

  const path = `${userId}/${patientId}/${randomId()}-${sanitizeFileName(file.name)}`;
  const url = `${SUPABASE_URL}/storage/v1/object/${PATIENT_FILES_BUCKET}/${path}`;

  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadError("Subida cancelada.", true));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("content-type", mime);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(Math.min(1, e.loaded / e.total));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
      } else {
        reject(new UploadError(messageFor(xhr.status, xhr.responseText ?? "")));
      }
    };
    xhr.onerror = () => reject(new UploadError("Se cortó la conexión mientras subíamos el archivo."));
    xhr.onabort = () => reject(new UploadError("Subida cancelada.", true));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    onProgress?.(0);
    xhr.send(file);
  });

  return { path, name: file.name.slice(0, 255), mime_type: mime, size_bytes: file.size };
};

/** Borra un objeto recién subido (p. ej. si falló el guardado de los datos). Silencioso. */
export const removeUploadedFile: RemoveFn = async (path) => {
  try {
    await createClient().storage.from(PATIENT_FILES_BUCKET).remove([path]);
  } catch {
    // Mejor esfuerzo: un archivo huérfano no es visible para nadie más.
  }
};
