import { ROW_KEYS, isBlankRow, type HistoryFormValues, type RowKey } from "@/components/clinical-history/schema";

export type SectionId =
  | "antecedentes"
  | "alertas"
  | "habitos"
  | "examen"
  | "movilidad"
  | "fuerza"
  | "pruebas"
  | "escalas"
  | "plan";

export type SectionMeta = {
  id: SectionId;
  title: string;
  /** Nombre corto para el índice / chips. */
  short: string;
  description: string;
  /** Claves (columnas o prefijos de filas) que pertenecen a la sección. */
  keys: (keyof HistoryFormValues)[];
};

export const SECTIONS: SectionMeta[] = [
  {
    id: "antecedentes",
    title: "Antecedentes patológicos",
    short: "Antecedentes",
    description: "Condiciones de salud, cirugías, medicación y tratamientos previos.",
    keys: [
      "conditions",
      "conditions_notes",
      "surgeries",
      "fractures",
      "medications",
      "allergies",
      "family_history",
      "previous_treatments",
    ],
  },
  {
    id: "alertas",
    title: "Alertas y contraindicaciones",
    short: "Alertas",
    description: "Lo que tenés que tener presente antes de cada sesión.",
    keys: ["red_flags"],
  },
  {
    id: "habitos",
    title: "Hábitos y estilo de vida",
    short: "Hábitos",
    description: "Actividad física, descanso, trabajo y estrés.",
    keys: [
      "physical_activity",
      "physical_activity_frequency",
      "smoking",
      "alcohol",
      "sleep_hours",
      "sleep_quality",
      "work_type",
      "work_posture_notes",
      "stress_level",
    ],
  },
  {
    id: "examen",
    title: "Examen físico",
    short: "Examen físico",
    description: "Signos vitales, postura, marcha y palpación.",
    keys: [
      "height_cm",
      "weight_kg",
      "blood_pressure",
      "heart_rate",
      "respiratory_rate",
      "oxygen_saturation",
      "posture_assessment",
      "gait_assessment",
      "palpation",
    ],
  },
  {
    id: "movilidad",
    title: "Rango de movimiento",
    short: "Goniometría",
    description: "Goniometría activa y pasiva por articulación.",
    keys: ["range_of_motion"],
  },
  {
    id: "fuerza",
    title: "Fuerza muscular",
    short: "Fuerza",
    description: "Escala de Daniels, de 0 (nula) a 5 (normal).",
    keys: ["muscle_strength"],
  },
  {
    id: "pruebas",
    title: "Pruebas especiales",
    short: "Pruebas",
    description: "Tests ortopédicos y neurológicos con su resultado.",
    keys: ["special_tests"],
  },
  {
    id: "escalas",
    title: "Escalas funcionales",
    short: "Escalas",
    description: "Cuestionarios y escalas con su puntaje.",
    keys: ["functional_scales"],
  },
  {
    id: "plan",
    title: "Objetivos y plan",
    short: "Plan",
    description: "Objetivos terapéuticos, plan de tratamiento y frecuencia.",
    keys: ["short_term_goals", "long_term_goals", "treatment_plan", "prescribed_sessions", "session_frequency"],
  },
];

export const sectionDomId = (id: SectionId) => `hc-${id}`;

const hasValue = (v: unknown): boolean => {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return true;
  if (Array.isArray(v)) return v.length > 0;
  return false;
};

/** true si la sección tiene al menos un dato cargado (las filas vacías no cuentan). */
export function sectionHasData(section: SectionMeta, values: HistoryFormValues): boolean {
  return section.keys.some((k) => {
    if ((ROW_KEYS as string[]).includes(k)) {
      const rowKey = k as RowKey;
      return (values[rowKey] as unknown[]).some((row) => !isBlankRow(rowKey, row));
    }
    return hasValue(values[k]);
  });
}

/** Sección a la que pertenece una clave de error ("height_cm", "range_of_motion.<id>.joint"…). */
export function sectionOfErrorKey(key: string): SectionId | null {
  const head = key.split(".")[0];
  const found = SECTIONS.find((s) => (s.keys as string[]).includes(head));
  return found?.id ?? null;
}

export function errorCountBySection(errors: Record<string, string>): Partial<Record<SectionId, number>> {
  const out: Partial<Record<SectionId, number>> = {};
  for (const key of Object.keys(errors)) {
    const id = sectionOfErrorKey(key);
    if (id) out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}
