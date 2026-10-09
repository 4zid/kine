import { createStudyUpload, discardStudyUpload } from "@/app/(app)/pacientes/[id]/estudios/actions";
import { SUPABASE_PUBLISHABLE_KEY } from "@/lib/supabase/config";
import { resolveMimeType } from "@/components/studies/files";
import type { StudyFileInput } from "@/components/studies/schema";

/**
 * Subida directa del navegador a Storage (bucket privado "patient-files").
 * El servidor arma la ruta ({uid}/{paciente}/{uuid}-{nombre}) y emite una URL firmada de un solo
 * uso; el navegador sube el archivo con XMLHttpRequest para informar el progreso real. Así el
 * cliente de Supabase (supabase-js) no viaja al navegador.
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
  patientId: string;
  /** Ya no se usa: la ruta la arma el servidor con el uid de la sesión. */
  userId?: string;
  /** 0..1 */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

export type UploadFn = (params: UploadParams) => Promise<StudyFileInput>;
export type RemoveFn = (path: string) => Promise<void>;

/**
 * Datos de salud: que ni el navegador ni intermediarios guarden copias del archivo
 * (Storage devuelve este valor como Cache-Control al descargarlo).
 */
const CACHE_CONTROL = "private, no-store, max-age=0";

function messageFor(status: number, body: string): string {
  const text = body.toLowerCase();
  if (status === 413 || text.includes("maximum allowed size") || text.includes("too large")) {
    return "El archivo supera el máximo permitido (20 MB).";
  }
  if (text.includes("mime") || status === 415) return "Formato de archivo no admitido.";
  if (text.includes("signature") || text.includes("jwt") || text.includes("expired")) {
    return "El permiso para subir el archivo venció. Intentá de nuevo.";
  }
  if (status === 401 || status === 403 || text.includes("row-level security")) {
    return "No tenés permiso para subir este archivo. Volvé a ingresar e intentá de nuevo.";
  }
  if (status === 409) return "Ya existe un archivo con ese nombre. Intentá de nuevo.";
  return "No pudimos subir el archivo. Intentá de nuevo.";
}

export const uploadStudyFile: UploadFn = async ({ file, patientId, onProgress, signal }) => {
  const mime = resolveMimeType(file);
  if (!mime) throw new UploadError("Formato de archivo no admitido.");
  if (signal?.aborted) throw new UploadError("Subida cancelada.", true);

  let ticket: Awaited<ReturnType<typeof createStudyUpload>>;
  try {
    ticket = await createStudyUpload(patientId, { name: file.name, type: file.type, size: file.size });
  } catch {
    throw new UploadError("No pudimos preparar la subida. Revisá tu conexión e intentá de nuevo.");
  }
  if (!ticket.ok || !ticket.data) throw new UploadError(ticket.message ?? "No pudimos preparar la subida.");
  const { path, uploadUrl, mime_type } = ticket.data;

  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadError("Subida cancelada.", true));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", CACHE_CONTROL);
    xhr.setRequestHeader("content-type", mime_type);
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

  return { path, name: file.name.slice(0, 255), mime_type, size_bytes: file.size };
};

/**
 * Descarta un objeto recién subido que no llegó a guardarse (p. ej. el servidor rechazó los
 * datos). El servidor nunca borra un archivo que ya pertenece a un estudio. Silencioso.
 */
export const removeUploadedFile: RemoveFn = async (path) => {
  try {
    await discardStudyUpload(path);
  } catch {
    // Mejor esfuerzo: un archivo huérfano no es visible para nadie más.
  }
};
