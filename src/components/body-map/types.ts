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

/** Columnas de `treatment_sessions` para vincular registros (y nombrar las ya vinculadas). */
export const SESSION_OPTION_COLUMNS = "id, session_date, start_time, techniques";

/** Sesión que se puede vincular a un registro de dolor (o que ya está vinculada a alguno). */
export type SessionOption = Pick<TreatmentSession, "id" | "session_date" | "techniques"> & {
  /** "HH:MM:SS" (24 h). Opcional para no romper vistas previas viejas. */
  start_time?: string | null;
};

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
  /** Día (AR, "YYYY-MM-DD") del registro que define el estado: para mostrar qué tan reciente es. */
  day?: string;
};

/** Estado que devuelve la acción de guardar un registro (con el registro creado o editado). */
export type PainFormState = ActionState<{ record: PainRecordItem }>;

/**
 * Server Actions que usa el mapa. Se reciben por props (la página pasa las reales de
 * `app/(app)/pacientes/[id]/mapa/actions.ts`; las vistas previas pueden pasar simuladas).
 */
export type BodyMapActions = {
  create: (prev: PainFormState, formData: FormData) => Promise<PainFormState>;
  /** Corrige un registro existente (mismo formulario + `record_id`). Sin ella no se ofrece "Editar". */
  update?: (prev: PainFormState, formData: FormData) => Promise<PainFormState>;
  /** "Marcar como resuelto". `sessionId`: sesión de hoy a la que se vincula (opcional). */
  resolve: (patientId: string, region: string, sessionId?: string | null) => Promise<PainFormState>;
  remove: (recordId: string, patientId: string) => Promise<ActionState>;
};
