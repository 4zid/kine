import { getRegion } from "@/lib/body-regions";
import type { PainStatus } from "@/lib/types";
import { parseDateOnly, toISODate } from "@/lib/utils";
import { denormalizePoint } from "./geometry";
import type { PainRecordItem, RegionPaint } from "./types";

/**
 * Lógica pura del mapa (sin React): estado por zona a una fecha, tendencias y estadísticas.
 * Todo es determinístico (zona horaria fija de Argentina) para que servidor y cliente coincidan.
 */

/** Fecha local (AR) "YYYY-MM-DD" de un registro. */
export function recordDay(r: Pick<PainRecordItem, "recorded_at">): string {
  return toISODate(new Date(r.recorded_at));
}

function cmpRecords(a: PainRecordItem, b: PainRecordItem): number {
  const t = new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime();
  if (t !== 0) return t;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

/** Registros ordenados del más viejo al más nuevo. */
export function sortRecords(records: PainRecordItem[]): PainRecordItem[] {
  return records.slice().sort(cmpRecords);
}

export type RegionState = {
  region: string;
  latest: PainRecordItem;
  previous: PainRecordItem | null;
  count: number;
};

/**
 * Estado de cada zona a una fecha (inclusive): último registro con recorded_at ≤ fecha.
 * `sorted` debe venir ordenado ascendente (sortRecords). Sin fecha = estado actual.
 */
export function regionStatesAsOf(sorted: PainRecordItem[], asOf?: string | null): Map<string, RegionState> {
  const map = new Map<string, RegionState>();
  for (const r of sorted) {
    if (asOf && recordDay(r) > asOf) break;
    if (!getRegion(r.region)) continue;
    const prev = map.get(r.region);
    map.set(r.region, {
      region: r.region,
      latest: r,
      previous: prev ? prev.latest : null,
      count: (prev?.count ?? 0) + 1,
    });
  }
  return map;
}

export function isActivePain(r: Pick<PainRecordItem, "status" | "intensity">): boolean {
  return r.status !== "resolved" && r.intensity > 0;
}

export function trendOf(state: RegionState): "up" | "down" | "same" | "new" {
  if (!state.previous) return "new";
  const diff = state.latest.intensity - state.previous.intensity;
  if (diff > 0) return "up";
  if (diff < 0) return "down";
  return "same";
}

export type PainStats = { active: number; max: number | null; avg: number | null };

export function painStats(states: Map<string, RegionState>): PainStats {
  const active = [...states.values()].map((s) => s.latest).filter(isActivePain);
  if (!active.length) return { active: 0, max: null, avg: null };
  const max = Math.max(...active.map((r) => r.intensity));
  const avg = active.reduce((acc, r) => acc + r.intensity, 0) / active.length;
  return { active: active.length, max, avg };
}

/** Datos de pintura del mapa a partir del estado por zona. */
export function paintFromStates(states: Map<string, RegionState>): Record<string, RegionPaint> {
  const out: Record<string, RegionPaint> = {};
  for (const s of states.values()) {
    const r = s.latest;
    out[s.region] = {
      intensity: r.intensity,
      status: r.status,
      point: r.point_x != null && r.point_y != null ? denormalizePoint(r.point_x, r.point_y) : null,
      trend: trendOf(s),
    };
  }
  return out;
}

/** Días (AR) con registros, ascendentes y sin repetir. */
export function timelineDays(sorted: PainRecordItem[]): string[] {
  const days: string[] = [];
  for (const r of sorted) {
    const d = recordDay(r);
    if (days[days.length - 1] !== d) days.push(d);
  }
  return days;
}

/** "hoy", "ayer", "hace 3 días"… con `today` explícito (lo calcula el servidor). */
export function relativeDay(day: string, today: string): string {
  const diff = Math.round((parseDateOnly(today).getTime() - parseDateOnly(day).getTime()) / 86_400_000);
  if (diff <= 0) return diff === 0 ? "hoy" : "próximamente";
  if (diff === 1) return "ayer";
  if (diff < 7) return `hace ${diff} días`;
  if (diff < 30) {
    const w = Math.round(diff / 7);
    return `hace ${w} ${w === 1 ? "semana" : "semanas"}`;
  }
  if (diff < 365) {
    const m = Math.round(diff / 30);
    return `hace ${m} ${m === 1 ? "mes" : "meses"}`;
  }
  const y = Math.round(diff / 365);
  return `hace ${y} ${y === 1 ? "año" : "años"}`;
}

export function asPainStatus(value: string | null | undefined): PainStatus {
  return value === "improving" || value === "resolved" ? value : "active";
}
