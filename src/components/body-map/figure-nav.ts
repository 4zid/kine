import type { RegionShape } from "./geometry";

/**
 * Navegación con teclado dentro de una figura (roving tabindex): cada vista es UNA parada de Tab
 * y las flechas mueven el foco a la zona más cercana en esa dirección (según la geometría).
 * Funciones puras: se prueban sin React.
 */

export type NavKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Home" | "End";

export const NAV_KEYS: readonly string[] = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"];

type Shape = Pick<RegionShape, "id" | "anchor" | "bbox">;

/** Orden de lectura: de arriba hacia abajo y, en la misma altura, de izquierda a derecha. */
export function readingOrder<T extends Shape>(regions: T[]): T[] {
  return regions.slice().sort((a, b) => {
    const dy = a.anchor[1] - b.anchor[1];
    if (Math.abs(dy) > 6) return dy;
    return a.anchor[0] - b.anchor[0];
  });
}

/**
 * Zona a la que se mueve el foco desde `fromId` con la tecla `key`.
 * Arriba/abajo prefieren zonas que se superponen en horizontal (la misma columna del cuerpo);
 * izquierda/derecha, las que están a la misma altura. null si no hay ninguna en esa dirección.
 */
export function nextRegion<T extends Shape>(regions: T[], fromId: string | null, key: NavKey): string | null {
  if (!regions.length) return null;
  const ordered = readingOrder(regions);
  if (key === "Home") return ordered[0].id;
  if (key === "End") return ordered[ordered.length - 1].id;

  const from = regions.find((r) => r.id === fromId);
  if (!from) return ordered[0].id;
  const [fx, fy] = from.anchor;
  const vertical = key === "ArrowUp" || key === "ArrowDown";
  const sign = key === "ArrowDown" || key === "ArrowRight" ? 1 : -1;

  let best: T | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const r of regions) {
    if (r.id === from.id) continue;
    const [x, y] = r.anchor;
    const along = (vertical ? y - fy : x - fx) * sign;
    if (along <= 2) continue; // tiene que estar en esa dirección
    const across = Math.abs(vertical ? x - fx : y - fy);
    // ¿Comparten columna (vertical) o fila (horizontal)? Entonces el desvío penaliza poco; si no,
    // solo cuenta lo que está dentro de un cono de ~60° alrededor de la dirección.
    const [x0, y0, x1, y1] = r.bbox;
    const overlaps = vertical ? fx >= x0 && fx <= x1 : fy >= y0 && fy <= y1;
    if (!overlaps && across > along * 2) continue;
    const score = along + across * (overlaps ? 1 : 3);
    if (score < bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best?.id ?? null;
}
