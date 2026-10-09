/**
 * Tipos y helpers puros del módulo de pacientes (listado + resumen).
 * Sin "server-only": los usan tanto los Server Components como los componentes cliente.
 */
import type { Attendance, PainStatus, PatientStatus, StudyKind } from "@/lib/types";

// ---------------------------------------------------------------------------
// Listado: filtros en la URL (?q, ?estado, ?orden, ?pagina)
// ---------------------------------------------------------------------------
export const PATIENTS_PAGE_SIZE = 30;

export type StatusFilter = PatientStatus | "all";
export type PatientSort = "recent" | "name" | "pain";

export type PatientListParams = {
  q: string;
  status: StatusFilter;
  sort: PatientSort;
  page: number;
};

/** Valor en la URL (en español) de cada filtro de estado. */
export const STATUS_PARAM: Record<StatusFilter, string> = {
  active: "activos",
  discharged: "alta",
  archived: "archivados",
  all: "todos",
};

export const SORT_PARAM: Record<PatientSort, string> = {
  recent: "recientes",
  name: "nombre",
  pain: "dolor",
};

/** Mismas etiquetas que el estado del paciente (PATIENT_STATUS), más "Todos". */
export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  active: "En tratamiento",
  discharged: "Alta",
  archived: "Archivado",
  all: "Todos",
};

export const SORT_LABELS: Record<PatientSort, string> = {
  /** Última actividad: datos del paciente, sesiones o registros de dolor. */
  recent: "Recientes",
  name: "Nombre",
  pain: "Dolor",
};

export const DEFAULT_LIST_PARAMS: PatientListParams = { q: "", status: "active", sort: "recent", page: 1 };

const MAX_QUERY_LENGTH = 80;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function fromParam<K extends string>(map: Record<K, string>, raw: string | undefined, fallback: K): K {
  const entry = (Object.entries(map) as [K, string][]).find(([, v]) => v === raw);
  return entry ? entry[0] : fallback;
}

/** Lee y normaliza los filtros del listado desde searchParams (nunca lanza). */
export function parsePatientListParams(sp: Record<string, string | string[] | undefined>): PatientListParams {
  const q = (first(sp.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const page = Number.parseInt(first(sp.pagina) ?? "1", 10);
  return {
    q,
    status: fromParam(STATUS_PARAM, first(sp.estado), DEFAULT_LIST_PARAMS.status),
    sort: fromParam(SORT_PARAM, first(sp.orden), DEFAULT_LIST_PARAMS.sort),
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

/** Arma la URL del listado omitiendo los valores por defecto. */
export function patientListHref(params: PatientListParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status !== DEFAULT_LIST_PARAMS.status) sp.set("estado", STATUS_PARAM[params.status]);
  if (params.sort !== DEFAULT_LIST_PARAMS.sort) sp.set("orden", SORT_PARAM[params.sort]);
  if (params.page > 1) sp.set("pagina", String(params.page));
  const qs = sp.toString();
  return qs ? `/pacientes?${qs}` : "/pacientes";
}

// ---------------------------------------------------------------------------
// Listado: filas y resultado
// ---------------------------------------------------------------------------
export type PatientListItem = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  sex: string | null;
  document_type: string | null;
  document_number: string | null;
  health_insurance: string | null;
  consultation_reason: string | null;
  kinesic_diagnosis: string | null;
  medical_diagnosis: string | null;
  status: PatientStatus;
  tags: string[];
  /** Última sesión asistida ya ocurrida (la vista excluye fechas futuras). */
  last_session_date: string | null;
  session_count: number;
  /** Dolor máximo entre las zonas activas del mapa (último registro de cada zona). */
  max_pain: number | null;
  active_regions: number;
  /** Fecha del registro de la zona con el dolor máximo (para mostrar qué tan actualizado está). */
  pain_recorded_at: string | null;
};

export type StatusCounts = Record<StatusFilter, number>;

export type PatientListResult = {
  items: PatientListItem[];
  /** Total de resultados con los filtros actuales. */
  total: number;
  page: number;
  pageCount: number;
  /** Conteo por estado (con la búsqueda aplicada). */
  counts: StatusCounts;
  /** Pacientes en tratamiento (sin búsqueda), para el encabezado. */
  activeTotal: number;
  /** El profesional todavía no cargó ningún paciente. */
  isEmptyAccount: boolean;
  error: string | null;
};

// ---------------------------------------------------------------------------
// Resumen del paciente
// ---------------------------------------------------------------------------
export type SummarySession = {
  id: string;
  session_date: string;
  start_time: string | null;
  attendance: Attendance;
  pain_before: number | null;
  pain_after: number | null;
  techniques: string[];
  subjective: string | null;
};

export type PainEvolutionPoint = {
  id: string;
  date: string;
  before: number | null;
  after: number | null;
};

export type SummaryPainZone = {
  id: string;
  region: string;
  view: string;
  intensity: number;
  status: PainStatus;
  recorded_at: string;
  pain_types: string[];
};

export type SummaryStudy = {
  id: string;
  title: string;
  kind: StudyKind;
  study_date: string | null;
  created_at: string;
};

export type PatientSummaryData = {
  /** Sesiones realizadas: asistencia "attended" y fecha ≤ hoy. */
  attendedCount: number;
  /** Sesiones registradas con fecha ≤ hoy (incluye ausentes / canceladas). */
  totalSessions: number;
  /** EVA de la sesión: al inicio de la primera sesión realizada con dato. */
  initialPain: { value: number; date: string } | null;
  /** EVA de la sesión: la última registrada (al final, o al inicio si no se cargó el final). */
  currentPain: { value: number; date: string } | null;
  /** Mejoría % según `computeSessionStats` (null si no hay contra qué comparar). */
  improvementPct: number | null;
  firstSessionDate: string | null;
  lastSessionDate: string | null;
  /** Últimas sesiones ya ocurridas (más reciente primero). */
  recentSessions: SummarySession[];
  /** Evolución de la EVA por sesión realizada (orden cronológico). */
  evolution: PainEvolutionPoint[];
  /** Zonas del mapa con dolor activo (no resueltas, intensidad > 0), de mayor a menor intensidad. */
  painZones: SummaryPainZone[];
  /** Último registro entre las zonas activas (qué tan actualizado está el mapa). */
  painUpdatedAt: string | null;
  studiesCount: number;
  latestStudy: SummaryStudy | null;
};
