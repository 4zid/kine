import { getRegion } from "@/lib/body-regions";
import { PAIN_STATUS } from "@/lib/constants";
import { PAIN_COLORS, painColor } from "@/lib/utils";
import { asPainStatus, relativeDay } from "./pain-state";
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

/** Mezcla un color hex con la tinta de la figura (0 = igual, 1 = tinta). */
function shade(hex: string, amount: number): string {
  const from = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const to = [1, 3, 5].map((i) => parseInt(FIGURE.ink.slice(i, i + 2), 16));
  return `#${from
    .map((v, i) => Math.round(v * (1 - amount) + to[i] * amount)
      .toString(16)
      .padStart(2, "0"))
    .join("")}`;
}

/**
 * Borde de las zonas con dolor: el mismo tono oscurecido a la mitad. Contra la figura neutra da
 * ≥ 3,3:1 en todos los valores (los rellenos de EVA 1–6 solos quedan por debajo de 3:1), así que
 * el dolor leve se distingue también sin color y en una impresión en escala de grises.
 */
const PAIN_EDGES = PAIN_COLORS.map((c) => shade(c, 0.5));

export function painEdge(intensity: number): string {
  return PAIN_EDGES[Math.max(0, Math.min(10, Math.round(intensity)))];
}

/**
 * Nombre accesible de una zona: "Hombro derecho (anterior), EVA 7 de 10, activo, actualizado hace
 * 3 días". La antigüedad solo se agrega si se conoce el día del registro y `today`.
 */
export function regionAriaLabel(
  regionId: string,
  p: (RegionPain & { day?: string }) | undefined | null,
  today?: string,
): string {
  const label = getRegion(regionId)?.label ?? regionId;
  if (!p) return `${label}, sin dolor registrado`;
  const when = p.day && today ? `, actualizado ${relativeDay(p.day, today)}` : "";
  if (isResolved(p)) return `${label}, resuelto${when}`;
  return `${label}, EVA ${p.intensity} de 10, ${PAIN_STATUS[asPainStatus(p.status)].label.toLowerCase()}${when}`;
}
