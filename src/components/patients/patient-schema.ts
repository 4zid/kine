/**
 * Validación del formulario de paciente. Espeja los CHECK y largos de `public.patients`
 * (supabase/migrations/*_init_schema.sql). Lo usan las Server Actions y el formulario (límites).
 */
import { z } from "zod";
import type { DocumentType, DominantSide, PatientInsert, Sex } from "@/lib/types";

export const PATIENT_LIMITS = {
  first_name: 100,
  last_name: 100,
  document_number: 30,
  gender_identity: 60,
  phone: 50,
  email: 200,
  address: 250,
  city: 100,
  occupation: 150,
  health_insurance: 150,
  health_insurance_plan: 100,
  health_insurance_number: 60,
  referring_doctor: 150,
  emergency_contact_name: 150,
  emergency_contact_phone: 50,
  emergency_contact_relation: 60,
  consultation_reason: 4000,
  medical_diagnosis: 4000,
  kinesic_diagnosis: 4000,
  injury_mechanism: 4000,
  notes: 8000,
} as const;

export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 40;
export const MIN_BIRTH_DATE = "1900-01-02";

const SEX_VALUES = ["female", "male", "intersex", "unspecified"] as const satisfies readonly Sex[];
const DOCUMENT_VALUES = ["DNI", "LC", "LE", "CI", "PASAPORTE", "OTRO"] as const satisfies readonly DocumentType[];
const SIDE_VALUES = ["right", "left", "ambidextrous"] as const satisfies readonly DominantSide[];
/** Documentos argentinos numéricos: se guardan sin puntos ni espacios. */
const NUMERIC_DOCUMENTS: DocumentType[] = ["DNI", "LC", "LE"];

/** Campos de texto del formulario (todos opcionales salvo nombre y apellido). */
export const PATIENT_TEXT_FIELDS = [
  "first_name",
  "last_name",
  "document_type",
  "document_number",
  "birth_date",
  "sex",
  "gender_identity",
  "phone",
  "email",
  "address",
  "city",
  "occupation",
  "dominant_side",
  "health_insurance",
  "health_insurance_plan",
  "health_insurance_number",
  "referring_doctor",
  "emergency_contact_name",
  "emergency_contact_phone",
  "emergency_contact_relation",
  "consultation_reason",
  "medical_diagnosis",
  "kinesic_diagnosis",
  "onset_date",
  "injury_mechanism",
  "notes",
] as const;

export type PatientTextField = (typeof PATIENT_TEXT_FIELDS)[number];
export type PatientFormValues = Record<PatientTextField, string>;
export type PatientFieldName = PatientTextField | "tags";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** true si "YYYY-MM-DD" es una fecha real del calendario. */
function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo ${max} caracteres.` })
    .transform((v) => (v === "" ? null : v));

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, { error: message }).max(max, { error: `Máximo ${max} caracteres.` });

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.enum(values, { error: message }).nullable());

/** Fecha opcional "YYYY-MM-DD" entre 1900 y hoy. */
const optionalPastDate = (today: string, messages: { min: string; future: string }) =>
  z
    .string()
    .trim()
    .superRefine((v, ctx) => {
      if (v === "") return;
      if (!isRealDate(v)) ctx.addIssue({ code: "custom", message: "Ingresá una fecha válida." });
      else if (v < MIN_BIRTH_DATE) ctx.addIssue({ code: "custom", message: messages.min });
      else if (v > today) ctx.addIssue({ code: "custom", message: messages.future });
    })
    .transform((v) => (v === "" ? null : v));

const digitCount = (v: string) => (v.match(/\d/g) ?? []).length;

function buildSchema(today: string) {
  return z
    .object({
      first_name: requiredText(PATIENT_LIMITS.first_name, "Ingresá el nombre."),
      last_name: requiredText(PATIENT_LIMITS.last_name, "Ingresá el apellido."),
      document_type: z
        .string()
        .trim()
        .transform((v) => (v === "" ? "DNI" : v))
        .pipe(z.enum(DOCUMENT_VALUES, { error: "Elegí un tipo de documento válido." })),
      document_number: text(PATIENT_LIMITS.document_number),
      birth_date: optionalPastDate(today, {
        min: "La fecha tiene que ser posterior a 1900.",
        future: "La fecha de nacimiento no puede ser futura.",
      }),
      sex: optionalEnum(SEX_VALUES, "Elegí una opción válida."),
      gender_identity: text(PATIENT_LIMITS.gender_identity),
      phone: text(PATIENT_LIMITS.phone).refine((v) => v == null || digitCount(v) >= 6, {
        error: "Revisá el teléfono (al menos 6 dígitos).",
      }),
      email: z
        .string()
        .trim()
        .toLowerCase()
        .max(PATIENT_LIMITS.email, { error: `Máximo ${PATIENT_LIMITS.email} caracteres.` })
        .refine((v) => v === "" || z.email().safeParse(v).success, { error: "Revisá el email." })
        .transform((v) => (v === "" ? null : v)),
      address: text(PATIENT_LIMITS.address),
      city: text(PATIENT_LIMITS.city),
      occupation: text(PATIENT_LIMITS.occupation),
      dominant_side: optionalEnum(SIDE_VALUES, "Elegí una opción válida."),
      health_insurance: text(PATIENT_LIMITS.health_insurance),
      health_insurance_plan: text(PATIENT_LIMITS.health_insurance_plan),
      health_insurance_number: text(PATIENT_LIMITS.health_insurance_number),
      referring_doctor: text(PATIENT_LIMITS.referring_doctor),
      emergency_contact_name: text(PATIENT_LIMITS.emergency_contact_name),
      emergency_contact_phone: text(PATIENT_LIMITS.emergency_contact_phone).refine(
        (v) => v == null || digitCount(v) >= 6,
        { error: "Revisá el teléfono (al menos 6 dígitos)." },
      ),
      emergency_contact_relation: text(PATIENT_LIMITS.emergency_contact_relation),
      consultation_reason: text(PATIENT_LIMITS.consultation_reason),
      medical_diagnosis: text(PATIENT_LIMITS.medical_diagnosis),
      kinesic_diagnosis: text(PATIENT_LIMITS.kinesic_diagnosis),
      onset_date: optionalPastDate(today, {
        min: "Revisá la fecha de inicio.",
        future: "La fecha de inicio no puede ser futura.",
      }),
      injury_mechanism: text(PATIENT_LIMITS.injury_mechanism),
      notes: text(PATIENT_LIMITS.notes),
      tags: z
        .array(
          z
            .string()
            .trim()
            .max(MAX_TAG_LENGTH, { error: `Cada etiqueta puede tener hasta ${MAX_TAG_LENGTH} caracteres.` }),
        )
        .max(MAX_TAGS, { error: `Podés agregar hasta ${MAX_TAGS} etiquetas.` })
        .transform((tags) => {
          const seen = new Set<string>();
          return tags.filter((t) => {
            const key = t.toLocaleLowerCase("es-AR");
            if (!t || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }),
    });
}

export type PatientPayload = Omit<PatientInsert, "id" | "professional_id" | "created_at" | "updated_at" | "status">;

export type ParsedPatientForm =
  | { ok: true; data: PatientPayload }
  | { ok: false; fieldErrors: Partial<Record<PatientFieldName, string>> };

/** Lee y valida el FormData del formulario de paciente. `today` = "YYYY-MM-DD" (Argentina). */
export function parsePatientForm(formData: FormData, today: string): ParsedPatientForm {
  const raw: Record<string, unknown> = {};
  for (const key of PATIENT_TEXT_FIELDS) {
    const v = formData.get(key);
    raw[key] = typeof v === "string" ? v : "";
  }
  raw.tags = formData.getAll("tags").filter((v): v is string => typeof v === "string");

  const result = buildSchema(today).safeParse(raw);
  const fieldErrors: Partial<Record<PatientFieldName, string>> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "") as PatientFieldName;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }

  // Validaciones entre campos (se evalúan siempre, para mostrar todos los errores juntos).
  const documentType = String(raw.document_type || "DNI").trim() as DocumentType;
  const documentNumber = normalizeDocument(documentType, String(raw.document_number ?? "").trim());
  if (documentNumber && NUMERIC_DOCUMENTS.includes(documentType) && !/^\d{6,9}$/.test(documentNumber)) {
    fieldErrors.document_number ??= `El ${documentType} lleva solo números (7 u 8 dígitos).`;
  }
  const birth = String(raw.birth_date ?? "").trim();
  const onset = String(raw.onset_date ?? "").trim();
  if (birth && onset && isRealDate(birth) && isRealDate(onset) && onset < birth) {
    fieldErrors.onset_date ??= "Es anterior a la fecha de nacimiento.";
  }

  if (!result.success || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, data: { ...result.data, document_number: documentNumber || null } };
}

/** DNI/LC/LE se guardan sin puntos, espacios ni guiones. */
function normalizeDocument(type: DocumentType, number: string): string {
  return NUMERIC_DOCUMENTS.includes(type) ? number.replace(/[.\s-]/g, "") : number;
}

/** Valores iniciales del formulario a partir de un paciente (o vacíos). */
export function patientFormValues(patient?: Partial<Record<PatientTextField, string | null>> | null): PatientFormValues {
  const values = {} as PatientFormValues;
  for (const key of PATIENT_TEXT_FIELDS) values[key] = patient?.[key] ?? "";
  if (!values.document_type) values.document_type = "DNI";
  return values;
}
