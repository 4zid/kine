import { z } from "zod";
import { MAX_UPLOAD_BYTES, STUDY_KINDS } from "@/lib/constants";
import type { ActionState, StudyKind } from "@/lib/types";
import { ALLOWED_MIME_TYPES } from "@/components/studies/files";

/** Validación compartida (cliente + Server Actions) de `patient_studies`. */

const STUDY_KIND_VALUES = Object.keys(STUDY_KINDS) as [StudyKind, ...StudyKind[]];

/** Metadatos editables del estudio. `today` = hoy en Argentina ("YYYY-MM-DD"). */
export function studyMetaSchema(today: string) {
  return z.object({
    kind: z.enum(STUDY_KIND_VALUES, { error: "Elegí el tipo de estudio" }),
    title: z
      .string({ error: "Poné un título al estudio" })
      .transform((v) => v.trim())
      .refine((v) => v.length > 0, { error: "Poné un título al estudio" })
      .refine((v) => v.length <= 200, { error: "Máximo 200 caracteres" }),
    study_date: z
      .string({ error: "Fecha inválida" })
      .nullish()
      .transform((v) => (v ?? "").trim())
      .refine((v) => v === "" || z.iso.date().safeParse(v).success, { error: "Fecha inválida" })
      .refine((v) => v === "" || v <= today, { error: "La fecha no puede ser futura" })
      .refine((v) => v === "" || v > "1900-01-01", { error: "Fecha inválida" })
      .transform((v) => (v === "" ? null : v)),
    findings: z
      .string({ error: "Texto inválido" })
      .nullish()
      .transform((v) => (v ?? "").trim())
      .refine((v) => v.length <= 8000, { error: "Máximo 8.000 caracteres" })
      .transform((v) => (v === "" ? null : v)),
  });
}

export type StudyMetaInput = {
  kind: StudyKind | "";
  title: string;
  study_date: string;
  findings: string;
};

export type StudyMeta = z.output<ReturnType<typeof studyMetaSchema>>;

/** Archivo ya subido a Storage desde el navegador. */
export const studyFileSchema = z.object({
  path: z.string({ error: "Archivo inválido" }).min(1).max(500),
  name: z
    .string({ error: "Archivo inválido" })
    .transform((v) => v.trim().slice(0, 255))
    .refine((v) => v.length > 0, { error: "Archivo inválido" }),
  mime_type: z.enum(ALLOWED_MIME_TYPES, { error: "Formato de archivo no admitido" }),
  size_bytes: z
    .number({ error: "Archivo inválido" })
    .int()
    .positive({ error: "El archivo está vacío" })
    .max(MAX_UPLOAD_BYTES, { error: "El archivo supera los 20 MB" }),
});

export type StudyFileInput = z.input<typeof studyFileSchema>;

export type StudyFileChange = { mode: "keep" } | { mode: "remove" } | { mode: "replace"; file: StudyFileInput };

/** Errores de zod → { campo: mensaje }. */
export function zodFieldErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Estudio listo para mostrar (fechas formateadas en el servidor). */
export type StudyListItem = {
  id: string;
  kind: StudyKind;
  title: string;
  study_date: string | null;
  /** "12 sep 2026" */
  dateLabel: string | null;
  findings: string | null;
  /** "hace 3 días" */
  createdLabel: string;
  file: { name: string; mime_type: string | null; size_bytes: number | null } | null;
  /** URL firmada (1 h) para miniaturas de imágenes. */
  thumbnailUrl: string | null;
};

// ---------------------------------------------------------------------------
// Firmas de las Server Actions (inyectables en vistas previas)
// ---------------------------------------------------------------------------
export type CreateStudyAction = (
  patientId: string,
  meta: StudyMetaInput,
  file: StudyFileInput | null,
) => Promise<ActionState<{ id: string }>>;

export type UpdateStudyAction = (
  studyId: string,
  meta: StudyMetaInput,
  change: StudyFileChange,
) => Promise<ActionState>;

export type DeleteStudyAction = (studyId: string) => Promise<ActionState>;

export type StudyFileUrlAction = (studyId: string, mode: "view" | "download") => Promise<ActionState<{ url: string }>>;
