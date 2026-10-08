import type { ActionState, PainRecord, TreatmentSession } from "@/lib/types";

/** Columnas de `pain_records` que usa el mapa (select de Supabase). */
export const PAIN_RECORD_COLUMNS =
  "id, region, view, point_x, point_y, intensity, pain_types, frequency, started_on, irradiation, aggravating_factors, relieving_factors, notes, status, recorded_at, session_id, created_at";

/** Registro de dolor tal como lo consume el mapa (sin columnas internas). */
export type PainRecordItem = Pick<
  PainRecord,
  | "id"
  | "region"
  | "view"
  | "point_x"
  | "point_y"
  | "intensity"
  | "pain_types"
  | "frequency"
  | "started_on"
  | "irradiation"
  | "aggravating_factors"
  | "relieving_factors"
  | "notes"
  | "status"
  | "recorded_at"
  | "session_id"
  | "created_at"
>;

/** Sesión que se puede vincular a un registro de dolor. */
export type SessionOption = Pick<TreatmentSession, "id" | "session_date" | "techniques">;

/** Estado de dolor de una zona para dibujar el mapa (también lo usa BodyMapPreview). */
export type RegionPain = {
  intensity: number;
  status?: string | null;
};

/** Información extra que solo usa el mapa interactivo. */
export type RegionPaint = RegionPain & {
  /** Punto exacto en coordenadas del viewBox (si se registró). */
  point?: [number, number] | null;
  trend?: "up" | "down" | "same" | "new";
};

/** Estado que devuelve la acción de guardar un registro (con el registro creado). */
export type PainFormState = ActionState<{ record: PainRecordItem }>;

/**
 * Server Actions que usa el mapa. Se reciben por props (la página pasa las reales de
 * `app/(app)/pacientes/[id]/mapa/actions.ts`; las vistas previas pueden pasar simuladas).
 */
export type BodyMapActions = {
  create: (prev: PainFormState, formData: FormData) => Promise<PainFormState>;
  resolve: (patientId: string, region: string) => Promise<PainFormState>;
  remove: (recordId: string, patientId: string) => Promise<ActionState>;
};
