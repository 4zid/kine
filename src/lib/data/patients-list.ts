import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PatientStatus } from "@/lib/types";
import {
  PATIENTS_PAGE_SIZE,
  type PatientListItem,
  type PatientListParams,
  type PatientListResult,
  type StatusCounts,
} from "@/lib/data/patients-types";

const LIST_COLUMNS =
  "id, first_name, last_name, birth_date, sex, document_type, document_number, health_insurance, consultation_reason, kinesic_diagnosis, medical_diagnosis, status, tags, last_session_date, session_count, max_pain, active_regions" as const;

/**
 * Normaliza la búsqueda igual que la columna generada `patients.search_text`
 * (minúsculas, sin acentos): "Pérez" y "perez" encuentran lo mismo. Los documentos con
 * puntos o guiones ("30.123.456") se comparan sin separadores. Máximo 4 términos.
 */
export function searchTerms(q: string): string[] {
  return q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[,()"'\\*:%_]/g, " ")
    .split(/\s+/)
    .map((t) => (/^[\d.\-]+$/.test(t) ? t.replace(/[.\-]/g, "") : t))
    .filter(Boolean)
    .slice(0, 4);
}

/**
 * Un patrón ILIKE por término sobre `search_text` (índice trigram). Encadenar varios
 * `.ilike()` los combina con AND ("juan perez" encuentra a Juan Pérez).
 */
export function searchPatterns(q: string): string[] {
  return searchTerms(q).map((term) => `%${term}%`);
}

function isStatus(value: string | null): value is PatientStatus {
  return value === "active" || value === "discharged" || value === "archived";
}

/** Listado paginado de pacientes desde la vista `patient_overview` (la RLS filtra por profesional). */
export async function listPatients(params: PatientListParams): Promise<PatientListResult> {
  const supabase = await createClient();
  const patterns = searchPatterns(params.q);
  const hasSearch = patterns.length > 0;

  const countQuery = (status: PatientStatus | null, withSearch: boolean) => {
    let query = supabase.from("patients").select("id", { count: "exact", head: true });
    if (status) query = query.eq("status", status);
    if (withSearch) for (const p of patterns) query = query.ilike("search_text", p);
    return query;
  };

  const [activeRes, dischargedRes, archivedRes, activeAllRes, accountRes] = await Promise.all([
    countQuery("active", hasSearch),
    countQuery("discharged", hasSearch),
    countQuery("archived", hasSearch),
    hasSearch ? countQuery("active", false) : null,
    hasSearch ? countQuery(null, false) : null,
  ]);

  const countError = [activeRes, dischargedRes, archivedRes, activeAllRes, accountRes].find((r) => r?.error)?.error;

  const counts: StatusCounts = {
    active: activeRes.count ?? 0,
    discharged: dischargedRes.count ?? 0,
    archived: archivedRes.count ?? 0,
    all: 0,
  };
  counts.all = counts.active + counts.discharged + counts.archived;

  const activeTotal = activeAllRes ? (activeAllRes.count ?? 0) : counts.active;
  const accountTotal = accountRes ? (accountRes.count ?? 0) : counts.all;

  const total = counts[params.status];
  const pageCount = Math.max(1, Math.ceil(total / PATIENTS_PAGE_SIZE));
  const page = Math.min(params.page, pageCount);

  const base: Omit<PatientListResult, "items" | "error"> = {
    total,
    page,
    pageCount,
    counts,
    activeTotal,
    isEmptyAccount: !countError && accountTotal === 0,
  };

  if (countError) {
    console.error("[pacientes] error al contar pacientes", countError.message);
    return { ...base, items: [], error: "No pudimos cargar tus pacientes." };
  }
  if (total === 0) return { ...base, items: [], error: null };

  let query = supabase.from("patient_overview").select(LIST_COLUMNS);
  if (params.status !== "all") query = query.eq("status", params.status);
  for (const p of patterns) query = query.ilike("search_text", p);

  switch (params.sort) {
    case "name":
      query = query.order("last_name", { ascending: true }).order("first_name", { ascending: true });
      break;
    case "pain":
      query = query
        .order("max_pain", { ascending: false, nullsFirst: false })
        .order("active_regions", { ascending: false })
        .order("last_name", { ascending: true });
      break;
    default:
      // Actividad reciente: primero los que todavía no tuvieron sesión (recién cargados),
      // después por la última sesión.
      query = query
        .order("last_session_date", { ascending: false, nullsFirst: true })
        .order("created_at", { ascending: false });
  }

  const from = (page - 1) * PATIENTS_PAGE_SIZE;
  const { data, error } = await query.order("id").range(from, from + PATIENTS_PAGE_SIZE - 1);

  if (error) {
    console.error("[pacientes] error al listar pacientes", error.message);
    return { ...base, items: [], error: "No pudimos cargar tus pacientes." };
  }

  const items: PatientListItem[] = [];
  for (const row of data ?? []) {
    if (!row.id) continue;
    items.push({
      id: row.id,
      first_name: row.first_name ?? "",
      last_name: row.last_name ?? "",
      birth_date: row.birth_date,
      sex: row.sex,
      document_type: row.document_type,
      document_number: row.document_number,
      health_insurance: row.health_insurance,
      consultation_reason: row.consultation_reason,
      kinesic_diagnosis: row.kinesic_diagnosis,
      medical_diagnosis: row.medical_diagnosis,
      status: isStatus(row.status) ? row.status : "active",
      tags: row.tags ?? [],
      last_session_date: row.last_session_date,
      session_count: row.session_count ?? 0,
      max_pain: row.max_pain,
      active_regions: row.active_regions ?? 0,
    });
  }

  return { ...base, items, error: null };
}
