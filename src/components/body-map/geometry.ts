import { BODY_REGIONS } from "@/lib/body-regions";
import type { BodyView } from "@/lib/types";
import { BACK_SHAPES, FRONT_SHAPES, OUTLINE_PATH, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from "./geometry.data";

/**
 * Geometría del mapa corporal (API pública).
 *
 * Los paths se generan con `geometry-builder.ts` → `geometry.data.ts`. Coordenadas en un viewBox
 * fijo de 340 × 780: los puntos exactos que se guardan en `pain_records.point_x/point_y` están
 * normalizados a este viewBox (0..1), así que NO hay que cambiar sus dimensiones.
 */
export type RegionShape = {
  /** id de zona (src/lib/body-regions.ts). */
  id: string;
  /** Path SVG cerrado (Bézier cúbicas). */
  d: string;
  /** Punto interior más alejado de los bordes: ancla para pines, pulsos y tooltips. */
  anchor: [number, number];
  /** Radio del mayor círculo inscripto en el ancla (útil para escalar marcadores). */
  radius: number;
  /** [x0, y0, x1, y1] */
  bbox: [number, number, number, number];
  /** Zona chica (muñeca, tobillo, mano…): recibe un área táctil ampliada. */
  small: boolean;
};

export type ViewGeometry = {
  view: BodyView;
  viewBox: string;
  width: number;
  height: number;
  /** Silueta completa (para sombra / halo). */
  outline: string;
  regions: RegionShape[];
};

export { VIEWBOX_HEIGHT, VIEWBOX_WIDTH };

export const BODY_GEOMETRY: Record<BodyView, ViewGeometry> = {
  front: {
    view: "front",
    viewBox: `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`,
    width: VIEWBOX_WIDTH,
    height: VIEWBOX_HEIGHT,
    outline: OUTLINE_PATH,
    regions: FRONT_SHAPES,
  },
  back: {
    view: "back",
    viewBox: `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`,
    width: VIEWBOX_WIDTH,
    height: VIEWBOX_HEIGHT,
    outline: OUTLINE_PATH,
    regions: BACK_SHAPES,
  },
};

const SHAPES_BY_ID: Record<string, RegionShape> = Object.fromEntries(
  [...FRONT_SHAPES, ...BACK_SHAPES].map((s) => [s.id, s]),
);

export function getRegionShape(id: string | null | undefined): RegionShape | undefined {
  return id ? SHAPES_BY_ID[id] : undefined;
}

/** Convierte un punto normalizado (0..1) a coordenadas del viewBox. */
export function denormalizePoint(x: number, y: number): [number, number] {
  return [x * VIEWBOX_WIDTH, y * VIEWBOX_HEIGHT];
}

/** Convierte coordenadas del viewBox a un punto normalizado (0..1, recortado). */
export function normalizePoint(x: number, y: number): { x: number; y: number } {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return {
    x: Math.round(clamp(x / VIEWBOX_WIDTH) * 10000) / 10000,
    y: Math.round(clamp(y / VIEWBOX_HEIGHT) * 10000) / 10000,
  };
}

/**
 * Verificación de integridad catálogo ↔ geometría (la usa la vista de depuración y el generador):
 * cada zona del catálogo debe tener exactamente una forma en su vista.
 */
export function validateGeometry(): { view: BodyView; missing: string[]; extra: string[]; duplicates: string[] }[] {
  return (["front", "back"] as const).map((view) => {
    const expected = BODY_REGIONS.filter((r) => r.view === view).map((r) => r.id);
    const ids = BODY_GEOMETRY[view].regions.map((r) => r.id);
    return {
      view,
      missing: expected.filter((id) => !ids.includes(id)),
      extra: ids.filter((id) => !expected.includes(id)),
      duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
    };
  });
}

/** Posición en % (para superponer HTML sobre el SVG con el mismo aspect ratio). */
export function toPercent(x: number, y: number): { left: string; top: string } {
  return { left: `${(x / VIEWBOX_WIDTH) * 100}%`, top: `${(y / VIEWBOX_HEIGHT) * 100}%` };
}
