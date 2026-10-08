import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import type { StudyKind } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

/**
 * Archivos de estudios: tipos admitidos (espejan `allowed_mime_types` del bucket
 * "patient-files"), saneamiento de nombres y validación en el cliente.
 */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/dicom",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const EXTENSION_MIME: Record<string, AllowedMimeType> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  dcm: "application/dicom",
  dicom: "application/dicom",
};

/** Valor del atributo `accept` del input de archivo. */
export const FILE_ACCEPT = [...Object.keys(EXTENSION_MIME).map((ext) => `.${ext}`), ...ALLOWED_MIME_TYPES].join(",");

export const FORMATS_HINT = "PDF, JPG, PNG, WEBP, HEIC, Word o DICOM · hasta 20 MB";

export function isAllowedMime(value: string | null | undefined): value is AllowedMimeType {
  return typeof value === "string" && (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/**
 * Tipo MIME a usar para subir: el del navegador si es admitido; si no (p. ej. ""
 * para .dcm/.heic en algunos sistemas), se deduce de la extensión.
 */
export function resolveMimeType(file: { name: string; type: string }): AllowedMimeType | null {
  const type = file.type.toLowerCase();
  if (isAllowedMime(type)) return type;
  if (type === "image/jpg") return "image/jpeg";
  return EXTENSION_MIME[extensionOf(file.name)] ?? null;
}

/** Valida un archivo elegido por el usuario. Devuelve un mensaje de error o null. */
export function validateStudyFile(file: { name: string; type: string; size: number }): string | null {
  if (!resolveMimeType(file)) {
    return "Formato no admitido. Subí un PDF, una imagen (JPG, PNG, WEBP, HEIC), un Word o un DICOM.";
  }
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `El archivo pesa ${fileSize(file.size)}. El máximo es ${fileSize(MAX_UPLOAD_BYTES)}.`;
  }
  return null;
}

/**
 * Nombre seguro para la ruta en Storage: sin tildes, espacios ni símbolos,
 * conserva la extensión y no supera ~100 caracteres.
 */
export function sanitizeFileName(name: string): string {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/[-.]{2,}/g, "-")
      .replace(/^[-._]+|[-._]+$/g, "");
  const dot = name.lastIndexOf(".");
  const rawBase = dot > 0 ? name.slice(0, dot) : name;
  const rawExt = dot > 0 ? name.slice(dot + 1) : "";
  const ext = clean(rawExt).toLowerCase().slice(0, 10);
  const base = clean(rawBase).slice(0, 90 - ext.length) || "archivo";
  return ext ? `${base}.${ext}` : base;
}

export type FileCategory = "pdf" | "image" | "doc" | "dicom" | "other";

export function fileCategory(mime: string | null | undefined): FileCategory {
  if (!mime) return "other";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/dicom") return "dicom";
  if (mime.includes("word")) return "doc";
  return "other";
}

export const FILE_CATEGORY_LABEL: Record<FileCategory, string> = {
  pdf: "PDF",
  image: "Imagen",
  doc: "Word",
  dicom: "DICOM",
  other: "Archivo",
};

/** Imágenes que el navegador puede mostrar como miniatura (HEIC/HEIF no en la mayoría). */
export function isPreviewableImage(mime: string | null | undefined): boolean {
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/webp";
}

/** Se puede abrir en una pestaña (el resto se descarga). */
export function isViewableInBrowser(mime: string | null | undefined): boolean {
  return mime === "application/pdf" || isPreviewableImage(mime);
}

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const KIND_HINTS: [RegExp, StudyKind][] = [
  [/\b(rmn|rm|resonancia|mri)\b/, "mri"],
  [/\b(rx|radiografia|radiograf|placa)/, "xray"],
  [/\b(eco|ecografia|ecograf|ultrasonido)/, "ultrasound"],
  [/\b(tac|tc|tomografia|tomograf)/, "ct"],
  [/\b(emg|electromiograf)/, "emg"],
  [/\b(dmo|densitometria|densitometr)/, "densitometry"],
  [/\b(laboratorio|analisis|hemograma|lab)\b/, "lab"],
  [/\b(informe|derivacion|epicrisis|orden|receta)/, "medical_report"],
];

/** Sugiere el tipo de estudio a partir del nombre del archivo. */
export function guessKindFromName(name: string): StudyKind | null {
  const n = normalize(name).replace(/[_\-.]+/g, " ");
  for (const [re, kind] of KIND_HINTS) if (re.test(n)) return kind;
  return null;
}

/** Título legible a partir del nombre del archivo: "rmn_rodilla-der.pdf" → "Rmn rodilla der". */
export function titleFromFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "";
  const t = base.charAt(0).toUpperCase() + base.slice(1);
  return t.slice(0, 200);
}

/** Id aleatorio para la ruta (crypto.randomUUID requiere contexto seguro). */
export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // contexto no seguro
    }
  }
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Tamaño legible con coma decimal es-AR: "2,4 MB". */
export function fileSize(bytes: number | null | undefined): string {
  return formatBytes(bytes).replace(".", ",");
}

/** Regex de la ruta válida: {uid}/{patientId}/{uuid}-{nombre-saneado}. */
export const STORAGE_FILE_NAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[A-Za-z0-9._-]{1,100}$/i;
