import { z } from "zod";
import { CONDITIONS } from "@/lib/constants";
import type {
  ActionState,
  Alcohol,
  ClinicalHistory,
  FunctionalScaleEntry,
  MuscleStrengthEntry,
  RangeOfMotionEntry,
  Side,
  SleepQuality,
  Smoking,
  SpecialTestEntry,
  WorkType,
} from "@/lib/types";

/**
 * Modelo del formulario de historia clínica + validación compartida
 * (cliente para feedback inmediato, servidor como fuente de verdad).
 *
 * Los números viajan como texto (lo que tipeó el usuario, admite coma decimal)
 * y el esquema los convierte y valida contra los CHECK de la tabla
 * `clinical_histories`.
 */

// ---------------------------------------------------------------------------
// Tipos del formulario
// ---------------------------------------------------------------------------
export type Grade = MuscleStrengthEntry["grade"];
export type TestResult = SpecialTestEntry["result"];

export type RomRow = {
  id: string;
  joint: string;
  movement: string;
  side: Side;
  active_deg: string;
  passive_deg: string;
  notes: string;
};

export type StrengthRow = { id: string; muscle: string; side: Side; grade: Grade | null };

export type TestRow = { id: string; name: string; side: Side; result: TestResult | null; notes: string };

export type ScaleRow = { id: string; name: string; score: string; max: string; date: string };

export type HistoryFormValues = {
  // Antecedentes
  conditions: string[];
  conditions_notes: string;
  surgeries: string;
  fractures: string;
  medications: string;
  allergies: string;
  family_history: string;
  previous_treatments: string;
  red_flags: string;
  // Hábitos
  physical_activity: string;
  physical_activity_frequency: string;
  smoking: Smoking | "";
  alcohol: Alcohol | "";
  sleep_hours: string;
  sleep_quality: SleepQuality | "";
  work_type: WorkType | "";
  work_posture_notes: string;
  stress_level: number | null;
  // Examen físico
  height_cm: string;
  weight_kg: string;
  blood_pressure: string;
  heart_rate: string;
  respiratory_rate: string;
  oxygen_saturation: string;
  posture_assessment: string;
  gait_assessment: string;
  palpation: string;
  // Evaluaciones estructuradas
  range_of_motion: RomRow[];
  muscle_strength: StrengthRow[];
  special_tests: TestRow[];
  functional_scales: ScaleRow[];
  // Plan
  short_term_goals: string;
  long_term_goals: string;
  treatment_plan: string;
  prescribed_sessions: string;
  session_frequency: string;
};

export type RowKey = "range_of_motion" | "muscle_strength" | "special_tests" | "functional_scales";
export const ROW_KEYS: RowKey[] = ["range_of_motion", "muscle_strength", "special_tests", "functional_scales"];

/** Tope de filas por evaluación (protege la fila jsonb y la UI). */
export const MAX_ROWS = 60;

export const SIDE_VALUES = ["right", "left", "bilateral", "na"] as const satisfies readonly Side[];
export const TEST_RESULTS = ["positive", "negative", "inconclusive"] as const satisfies readonly TestResult[];
export const GRADES = [0, 1, 2, 3, 4, 5] as const satisfies readonly Grade[];

// ---------------------------------------------------------------------------
// Ids estables para filas (crypto.randomUUID requiere contexto seguro)
// ---------------------------------------------------------------------------
export function createRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // contexto no seguro (http en LAN): sigue con el fallback
    }
  }
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function newRomRow(prev?: RomRow): RomRow {
  return {
    id: createRowId(),
    joint: prev?.joint ?? "",
    movement: "",
    side: prev?.side ?? "right",
    active_deg: "",
    passive_deg: "",
    notes: "",
  };
}

export function newStrengthRow(prev?: StrengthRow): StrengthRow {
  return { id: createRowId(), muscle: "", side: prev?.side ?? "right", grade: null };
}

export function newTestRow(prev?: TestRow): TestRow {
  return { id: createRowId(), name: "", side: prev?.side ?? "right", result: null, notes: "" };
}

export function newScaleRow(today: string): ScaleRow {
  return { id: createRowId(), name: "", score: "", max: "", date: today };
}

// ---------------------------------------------------------------------------
// DB → formulario
// ---------------------------------------------------------------------------
export function emptyHistoryValues(): HistoryFormValues {
  return {
    conditions: [],
    conditions_notes: "",
    surgeries: "",
    fractures: "",
    medications: "",
    allergies: "",
    family_history: "",
    previous_treatments: "",
    red_flags: "",
    physical_activity: "",
    physical_activity_frequency: "",
    smoking: "",
    alcohol: "",
    sleep_hours: "",
    sleep_quality: "",
    work_type: "",
    work_posture_notes: "",
    stress_level: null,
    height_cm: "",
    weight_kg: "",
    blood_pressure: "",
    heart_rate: "",
    respiratory_rate: "",
    oxygen_saturation: "",
    posture_assessment: "",
    gait_assessment: "",
    palpation: "",
    range_of_motion: [],
    muscle_strength: [],
    special_tests: [],
    functional_scales: [],
    short_term_goals: "",
    long_term_goals: "",
    treatment_plan: "",
    prescribed_sessions: "",
    session_frequency: "",
  };
}

type UnknownRecord = Record<string, unknown>;
const isRecord = (v: unknown): v is UnknownRecord => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const numStr = (v: unknown): string =>
  typeof v === "number" && Number.isFinite(v) ? String(v).replace(".", ",") : typeof v === "string" ? v : "";
const pick = <T extends string | number>(v: unknown, allowed: readonly T[]): T | null =>
  allowed.includes(v as T) ? (v as T) : null;
const rowsOf = (v: unknown): UnknownRecord[] => (Array.isArray(v) ? v.filter(isRecord) : []);
const rowId = (v: unknown): string => (typeof v === "string" && v.trim() ? v.slice(0, 64) : createRowId());

/** Convierte la fila de la base en valores editables (tolerante a jsonb incompleto). */
export function historyToFormValues(row: ClinicalHistory | null): HistoryFormValues {
  const base = emptyHistoryValues();
  if (!row) return base;
  return {
    conditions: Array.isArray(row.conditions) ? row.conditions.filter((c) => CONDITION_VALUES.has(c)) : [],
    conditions_notes: row.conditions_notes ?? "",
    surgeries: row.surgeries ?? "",
    fractures: row.fractures ?? "",
    medications: row.medications ?? "",
    allergies: row.allergies ?? "",
    family_history: row.family_history ?? "",
    previous_treatments: row.previous_treatments ?? "",
    red_flags: row.red_flags ?? "",
    physical_activity: row.physical_activity ?? "",
    physical_activity_frequency: row.physical_activity_frequency ?? "",
    smoking: pick(row.smoking, SMOKING_VALUES) ?? "",
    alcohol: pick(row.alcohol, ALCOHOL_VALUES) ?? "",
    sleep_hours: numStr(row.sleep_hours),
    sleep_quality: pick(row.sleep_quality, SLEEP_VALUES) ?? "",
    work_type: pick(row.work_type, WORK_VALUES) ?? "",
    work_posture_notes: row.work_posture_notes ?? "",
    stress_level: typeof row.stress_level === "number" ? row.stress_level : null,
    height_cm: numStr(row.height_cm),
    weight_kg: numStr(row.weight_kg),
    blood_pressure: row.blood_pressure ?? "",
    heart_rate: numStr(row.heart_rate),
    respiratory_rate: numStr(row.respiratory_rate),
    oxygen_saturation: numStr(row.oxygen_saturation),
    posture_assessment: row.posture_assessment ?? "",
    gait_assessment: row.gait_assessment ?? "",
    palpation: row.palpation ?? "",
    range_of_motion: rowsOf(row.range_of_motion).map((r) => ({
      id: rowId(r.id),
      joint: str(r.joint),
      movement: str(r.movement),
      side: pick(r.side, SIDE_VALUES) ?? "na",
      active_deg: numStr(r.active_deg),
      passive_deg: numStr(r.passive_deg),
      notes: str(r.notes),
    })),
    muscle_strength: rowsOf(row.muscle_strength).map((r) => ({
      id: rowId(r.id),
      muscle: str(r.muscle),
      side: pick(r.side, SIDE_VALUES) ?? "na",
      grade: pick(r.grade, GRADES),
    })),
    special_tests: rowsOf(row.special_tests).map((r) => ({
      id: rowId(r.id),
      name: str(r.name),
      side: pick(r.side, SIDE_VALUES) ?? "na",
      result: pick(r.result, TEST_RESULTS),
      notes: str(r.notes),
    })),
    functional_scales: rowsOf(row.functional_scales).map((r) => ({
      id: rowId(r.id),
      name: str(r.name),
      score: numStr(r.score),
      max: numStr(r.max),
      date: typeof r.date === "string" && ISO_DATE_RE.test(r.date) ? r.date : "",
    })),
    short_term_goals: row.short_term_goals ?? "",
    long_term_goals: row.long_term_goals ?? "",
    treatment_plan: row.treatment_plan ?? "",
    prescribed_sessions: numStr(row.prescribed_sessions),
    session_frequency: row.session_frequency ?? "",
  };
}

// ---------------------------------------------------------------------------
// Helpers numéricos (compartidos con la UI: IMC, porcentajes)
// ---------------------------------------------------------------------------
/** "72,5" | "72.5" → 72.5 ; vacío o inválido → null. */
export function parseLocaleNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const s = value.trim().replace(/\s/g, "").replace(",", ".");
  if (s === "" || !/^-?\d*\.?\d+$|^-?\d+\.?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export type BmiCategory = { label: string; tone: "low" | "normal" | "over" | "obese" };

export function computeBmi(heightCm: string, weightKg: string): { value: number; category: BmiCategory } | null {
  const h = parseLocaleNumber(heightCm);
  const w = parseLocaleNumber(weightKg);
  if (h == null || w == null || h < 30 || h > 260 || w < 1 || w > 400) return null;
  const value = w / (h / 100) ** 2;
  if (!Number.isFinite(value)) return null;
  const category: BmiCategory =
    value < 18.5
      ? { label: "Bajo peso", tone: "low" }
      : value < 25
        ? { label: "Normal", tone: "normal" }
        : value < 30
          ? { label: "Sobrepeso", tone: "over" }
          : { label: "Obesidad", tone: "obese" };
  return { value: Math.round(value * 10) / 10, category };
}

// ---------------------------------------------------------------------------
// Esquema de validación (espeja los CHECK de clinical_histories)
// ---------------------------------------------------------------------------
const CONDITION_VALUES = new Set(CONDITIONS.map((c) => c.value));
const SMOKING_VALUES = ["never", "former", "current"] as const satisfies readonly Smoking[];
const ALCOHOL_VALUES = ["none", "occasional", "frequent"] as const satisfies readonly Alcohol[];
const SLEEP_VALUES = ["good", "regular", "poor"] as const satisfies readonly SleepQuality[];
const WORK_VALUES = ["sedentary", "standing", "mixed", "physical"] as const satisfies readonly WorkType[];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Texto opcional: trim, máximo de caracteres, vacío → null. */
const optionalText = (max: number) =>
  z
    .string({ error: "Texto inválido" })
    .nullish()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v.length <= max, { error: `Máximo ${max.toLocaleString("es-AR")} caracteres` })
    .transform((v) => (v === "" ? null : v));

/** Texto obligatorio dentro de una fila. */
const requiredText = (max: number, message: string) =>
  z
    .string({ error: message })
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { error: message })
    .refine((v) => v.length <= max, { error: `Máximo ${max} caracteres` });

type NumberOpts = { min: number; max: number; integer?: boolean; decimals?: number; unit?: string };

/** Número opcional escrito como texto (acepta coma decimal). Vacío → null. */
const optionalNumber = ({ min, max, integer = false, decimals = 1, unit = "" }: NumberOpts) =>
  z
    .union([z.string(), z.number(), z.null()], { error: "Ingresá un número válido" })
    .optional()
    .transform((v, ctx) => {
      if (v == null || (typeof v === "string" && v.trim() === "")) return null;
      const n = parseLocaleNumber(v);
      if (n == null) {
        ctx.addIssue({ code: "custom", message: "Ingresá un número válido" });
        return z.NEVER;
      }
      if (integer && !Number.isInteger(n)) {
        ctx.addIssue({ code: "custom", message: "Ingresá un número entero" });
        return z.NEVER;
      }
      if (n < min || n > max) {
        const fmt = (x: number) => x.toLocaleString("es-AR");
        ctx.addIssue({ code: "custom", message: `Entre ${fmt(min)} y ${fmt(max)}${unit}` });
        return z.NEVER;
      }
      const f = 10 ** decimals;
      return integer ? n : Math.round(n * f) / f;
    });

const optionalEnum = <T extends string>(values: readonly [T, ...T[]]) =>
  z
    .union([z.enum(values), z.literal("")], { error: "Elegí una opción válida" })
    .nullish()
    .transform((v): T | null => (v ? v : null));

const sideSchema = z.enum(SIDE_VALUES, { error: "Elegí el lado" });

const bloodPressure = z
  .string({ error: "Usá el formato 120/80" })
  .nullish()
  .transform((v, ctx) => {
    const s = (v ?? "").trim();
    if (s === "") return null;
    const m = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(s);
    if (!m) {
      ctx.addIssue({ code: "custom", message: "Usá el formato 120/80" });
      return z.NEVER;
    }
    const sys = Number(m[1]);
    const dia = Number(m[2]);
    if (sys < 50 || sys > 300 || dia < 20 || dia > 200 || sys <= dia) {
      ctx.addIssue({ code: "custom", message: "Revisá los valores (sistólica/diastólica)" });
      return z.NEVER;
    }
    return `${sys}/${dia}`;
  });

const rowId$ = z.string({ error: "Fila inválida" }).trim().min(1).max(64);
const rows = <T extends z.ZodType>(row: T, noun: string) =>
  z.array(row, { error: "Datos inválidos" }).max(MAX_ROWS, { error: `Máximo ${MAX_ROWS} ${noun}` });

const romRowSchema = z
  .object({
    id: rowId$,
    joint: requiredText(80, "Indicá la articulación"),
    movement: requiredText(80, "Indicá el movimiento"),
    side: sideSchema,
    active_deg: optionalNumber({ min: -180, max: 360, unit: "°" }),
    passive_deg: optionalNumber({ min: -180, max: 360, unit: "°" }),
    notes: optionalText(300),
  })
  .transform(
    (r): RangeOfMotionEntry => ({
      id: r.id,
      joint: r.joint,
      movement: r.movement,
      side: r.side,
      active_deg: r.active_deg,
      passive_deg: r.passive_deg,
      ...(r.notes ? { notes: r.notes } : {}),
    }),
  );

const strengthRowSchema = z
  .object({
    id: rowId$,
    muscle: requiredText(80, "Indicá el músculo o grupo muscular"),
    side: sideSchema,
    grade: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.null()], {
      error: "Elegí el grado",
    }),
  })
  .transform((r, ctx): MuscleStrengthEntry => {
    if (r.grade == null) {
      ctx.addIssue({ code: "custom", path: ["grade"], message: "Elegí el grado (0 a 5)" });
      return z.NEVER;
    }
    return { id: r.id, muscle: r.muscle, side: r.side, grade: r.grade };
  });

const testRowSchema = z
  .object({
    id: rowId$,
    name: requiredText(100, "Indicá la prueba"),
    side: sideSchema,
    result: z.union([z.enum(TEST_RESULTS), z.null()], { error: "Elegí el resultado" }),
    notes: optionalText(300),
  })
  .transform((r, ctx): SpecialTestEntry => {
    if (r.result == null) {
      ctx.addIssue({ code: "custom", path: ["result"], message: "Elegí el resultado" });
      return z.NEVER;
    }
    return { id: r.id, name: r.name, side: r.side, result: r.result, ...(r.notes ? { notes: r.notes } : {}) };
  });

const scaleRowSchema = z
  .object({
    id: rowId$,
    name: requiredText(100, "Indicá la escala"),
    score: optionalNumber({ min: 0, max: 10000, decimals: 2 }),
    max: optionalNumber({ min: 0.01, max: 10000, decimals: 2 }),
    date: z
      .string({ error: "Fecha inválida" })
      .nullish()
      .transform((v) => (v ?? "").trim())
      .refine((v) => v === "" || z.iso.date().safeParse(v).success, { error: "Fecha inválida" })
      .transform((v) => (v === "" ? null : v)),
  })
  .transform((r, ctx): FunctionalScaleEntry => {
    if (r.score != null && r.max != null && r.score > r.max) {
      ctx.addIssue({ code: "custom", path: ["score"], message: "Supera el máximo" });
      return z.NEVER;
    }
    return { id: r.id, name: r.name, score: r.score, max: r.max, date: r.date };
  });

export const historySchema = z.object(
  {
    conditions: z
      .array(z.string().max(60), { error: "Datos inválidos" })
      .max(CONDITIONS.length * 2)
      .transform((list) => [...new Set(list)].filter((c) => CONDITION_VALUES.has(c))),
    conditions_notes: optionalText(4000),
    surgeries: optionalText(4000),
    fractures: optionalText(4000),
    medications: optionalText(4000),
    allergies: optionalText(2000),
    family_history: optionalText(4000),
    previous_treatments: optionalText(4000),
    red_flags: optionalText(4000),

    physical_activity: optionalText(1000),
    physical_activity_frequency: optionalText(200),
    smoking: optionalEnum(SMOKING_VALUES),
    alcohol: optionalEnum(ALCOHOL_VALUES),
    sleep_hours: optionalNumber({ min: 0, max: 24, unit: " h" }),
    sleep_quality: optionalEnum(SLEEP_VALUES),
    work_type: optionalEnum(WORK_VALUES),
    work_posture_notes: optionalText(2000),
    stress_level: z
      .number({ error: "Elegí un valor de 0 a 10" })
      .int()
      .min(0)
      .max(10)
      .nullish()
      .transform((v) => v ?? null),

    height_cm: optionalNumber({ min: 30, max: 260, unit: " cm" }),
    weight_kg: optionalNumber({ min: 1, max: 400, unit: " kg" }),
    blood_pressure: bloodPressure,
    heart_rate: optionalNumber({ min: 20, max: 250, integer: true, unit: " lpm" }),
    respiratory_rate: optionalNumber({ min: 4, max: 80, integer: true, unit: " rpm" }),
    oxygen_saturation: optionalNumber({ min: 50, max: 100, integer: true, unit: " %" }),
    posture_assessment: optionalText(4000),
    gait_assessment: optionalText(4000),
    palpation: optionalText(4000),

    range_of_motion: rows(romRowSchema, "mediciones"),
    muscle_strength: rows(strengthRowSchema, "registros"),
    special_tests: rows(testRowSchema, "pruebas"),
    functional_scales: rows(scaleRowSchema, "escalas"),

    short_term_goals: optionalText(4000),
    long_term_goals: optionalText(4000),
    treatment_plan: optionalText(8000),
    prescribed_sessions: optionalNumber({ min: 0, max: 500, integer: true }),
    session_frequency: optionalText(100),
  },
  { error: "Datos inválidos" },
);

export type HistoryPayload = z.output<typeof historySchema>;

// ---------------------------------------------------------------------------
// Normalización (filas vacías) y mapeo de errores
// ---------------------------------------------------------------------------
const blank = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");

const BLANK_CHECKS: Record<RowKey, (row: UnknownRecord) => boolean> = {
  range_of_motion: (r) => [r.joint, r.movement, r.active_deg, r.passive_deg, r.notes].every(blank),
  muscle_strength: (r) => blank(r.muscle) && r.grade == null,
  special_tests: (r) => blank(r.name) && r.result == null && blank(r.notes),
  functional_scales: (r) => [r.name, r.score, r.max].every(blank),
};

/** true si la fila no tiene ningún dato (se descarta al guardar). */
export function isBlankRow(key: RowKey, row: unknown): boolean {
  return isRecord(row) && BLANK_CHECKS[key](row);
}

/** Descarta filas totalmente vacías (p. ej. "Agregar" sin completar). */
export function stripBlankRows(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  const out: UnknownRecord = { ...raw };
  for (const key of ROW_KEYS) {
    const list = raw[key];
    if (Array.isArray(list)) out[key] = list.filter((r) => !(isRecord(r) && BLANK_CHECKS[key](r)));
  }
  return out;
}

/** Clave de error de una celda de fila: "range_of_motion.<rowId>.joint". */
export const rowErrorKey = (key: RowKey, id: string, field: string) => `${key}.${id}.${field}`;

function issuesToFieldErrors(issues: z.core.$ZodIssue[], normalized: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const [head, index, field] = issue.path;
    let key: string;
    if (typeof head === "string" && (ROW_KEYS as string[]).includes(head) && typeof index === "number") {
      const list = isRecord(normalized) && Array.isArray(normalized[head]) ? (normalized[head] as unknown[]) : [];
      const row = list[index];
      const id = isRecord(row) && typeof row.id === "string" ? row.id : String(index);
      key = field != null ? rowErrorKey(head as RowKey, id, String(field)) : `${head}.${id}`;
    } else {
      key = issue.path.map(String).join(".") || "_form";
    }
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Resultado de la Server Action de guardado. */
export type SaveHistoryResult = {
  /** Valores normalizados tal como quedaron en la base. */
  values: HistoryFormValues;
  /** "8 oct, 14:30" (formateado en el servidor para evitar diferencias de hidratación). */
  updatedLabel: string;
  /** `updated_at` de la fila guardada: versión esperada para el próximo guardado. */
  updatedAt: string;
};

/**
 * Respuesta del guardado. `conflict` = otra pestaña o dispositivo guardó la historia después de
 * que se cargó este formulario (control de concurrencia optimista con `updated_at`).
 */
export type SaveHistoryOutcome = ActionState<SaveHistoryResult> & { conflict?: boolean };

export type HistoryValidation = { ok: true; data: HistoryPayload } | { ok: false; fieldErrors: Record<string, string> };

/** Normaliza y valida. Usar igual en cliente y servidor. */
export function validateHistory(raw: unknown): HistoryValidation {
  const normalized = stripBlankRows(raw);
  const parsed = historySchema.safeParse(normalized);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, fieldErrors: issuesToFieldErrors(parsed.error.issues, normalized) };
}
