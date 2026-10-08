/**
 * Campos, límites y valores iniciales del formulario de paciente, sin dependencias (sin zod):
 * los usa el formulario en el cliente. La validación vive en patient-schema.ts (servidor).
 * Espejan los CHECK y largos de `public.patients`.
 */

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

/** Valores iniciales del formulario a partir de un paciente (o vacíos). */
export function patientFormValues(patient?: Partial<Record<PatientTextField, string | null>> | null): PatientFormValues {
  const values = {} as PatientFormValues;
  for (const key of PATIENT_TEXT_FIELDS) values[key] = patient?.[key] ?? "";
  if (!values.document_type) values.document_type = "DNI";
  return values;
}
