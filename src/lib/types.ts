import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

// ---------------------------------------------------------------------------
// Filas de la base (alias legibles)
// ---------------------------------------------------------------------------
export type Professional = Tables<"professionals">;
export type Patient = Tables<"patients">;
export type PatientInsert = TablesInsert<"patients">;
export type PatientUpdate = TablesUpdate<"patients">;
export type ClinicalHistory = Tables<"clinical_histories">;
export type ClinicalHistoryUpdate = TablesUpdate<"clinical_histories">;
export type TreatmentSession = Tables<"treatment_sessions">;
export type TreatmentSessionInsert = TablesInsert<"treatment_sessions">;
export type PainRecord = Tables<"pain_records">;
export type PainRecordInsert = TablesInsert<"pain_records">;
export type PatientStudy = Tables<"patient_studies">;
export type PatientOverview = Tables<"patient_overview">;
export type PatientPainCurrent = Tables<"patient_pain_current">;

// ---------------------------------------------------------------------------
// Uniones de valores permitidos (espejan los CHECK de la base)
// ---------------------------------------------------------------------------
export type PatientStatus = "active" | "discharged" | "archived";
export type Sex = "female" | "male" | "intersex" | "unspecified";
export type DominantSide = "right" | "left" | "ambidextrous";
export type DocumentType = "DNI" | "LC" | "LE" | "CI" | "PASAPORTE" | "OTRO";
export type LicenseType = "nacional" | "provincial";

export type Smoking = "never" | "former" | "current";
export type Alcohol = "none" | "occasional" | "frequent";
export type SleepQuality = "good" | "regular" | "poor";
export type WorkType = "sedentary" | "standing" | "mixed" | "physical";

export type Attendance = "attended" | "absent" | "cancelled";

export type BodyView = "front" | "back";
export type PainFrequency = "constant" | "intermittent" | "movement" | "rest" | "night" | "morning";
export type PainStatus = "active" | "improving" | "resolved";

export type StudyKind =
  | "xray"
  | "mri"
  | "ultrasound"
  | "ct"
  | "emg"
  | "densitometry"
  | "lab"
  | "medical_report"
  | "other";

// ---------------------------------------------------------------------------
// Estructuras JSON de la historia clínica (columnas jsonb)
// ---------------------------------------------------------------------------
export type Side = "right" | "left" | "bilateral" | "na";

export type RangeOfMotionEntry = {
  id: string;
  joint: string;
  movement: string;
  side: Side;
  active_deg: number | null;
  passive_deg: number | null;
  notes?: string;
};

export type MuscleStrengthEntry = {
  id: string;
  muscle: string;
  side: Side;
  grade: 0 | 1 | 2 | 3 | 4 | 5;
};

export type SpecialTestEntry = {
  id: string;
  name: string;
  side: Side;
  result: "positive" | "negative" | "inconclusive";
  notes?: string;
};

export type FunctionalScaleEntry = {
  id: string;
  name: string;
  score: number | null;
  max: number | null;
  date: string | null; // YYYY-MM-DD
};

// ---------------------------------------------------------------------------
// Resultado estándar de Server Actions usado con useActionState
// ---------------------------------------------------------------------------
export type ActionState<T = undefined> = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
  data?: T;
};

export const initialActionState: ActionState = { ok: false };
