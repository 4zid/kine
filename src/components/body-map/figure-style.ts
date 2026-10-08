import { getRegion } from "@/lib/body-regions";
import { PAIN_STATUS } from "@/lib/constants";
import { painColor } from "@/lib/utils";
import { asPainStatus } from "./pain-state";
import type { RegionPain } from "./types";

/** Colores de la figura (escala de datos; el resto usa tokens del tema). */
export const FIGURE = {
  neutral: "#E2E2E9",
  gap: "#FFFFFF",
  resolvedFill: "#E4F3EA",
  resolvedStroke: "#2F9E5B",
  ink: "#111114",
} as const;

export function isPainful(p: RegionPain | undefined | null): p is RegionPain {
  return Boolean(p && p.status !== "resolved" && p.intensity > 0);
}

export function isResolved(p: RegionPain | undefined | null): boolean {
  return Boolean(p && (p.status === "resolved" || p.intensity === 0));
}

export function regionFill(p: RegionPain | undefined | null, showResolved = false): string {
  if (isPainful(p)) return painColor(p.intensity);
  if (showResolved && isResolved(p)) return FIGURE.resolvedFill;
  return FIGURE.neutral;
}

/** Nombre accesible de una zona: "Hombro derecho (anterior), dolor 7 de 10, activo". */
export function regionAriaLabel(regionId: string, p: RegionPain | undefined | null): string {
  const label = getRegion(regionId)?.label ?? regionId;
  if (!p) return `${label}, sin dolor registrado`;
  if (isResolved(p)) return `${label}, resuelto`;
  return `${label}, dolor ${p.intensity} de 10, ${PAIN_STATUS[asPainStatus(p.status)].label.toLowerCase()}`;
}
