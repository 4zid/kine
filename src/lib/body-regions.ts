import type { BodyView } from "@/lib/types";

/**
 * Catálogo de zonas del mapa corporal.
 *
 * - `id` es el slug que se guarda en `pain_records.region` (^[a-z0-9_]{2,60}$).
 * - Cada zona pertenece a UNA vista (frente o espalda).
 * - `side` es el lado DEL PACIENTE.
 *
 * Convención anatómica para dibujar:
 *   · Vista FRENTE: el lado derecho del paciente se dibuja a la IZQUIERDA del observador.
 *   · Vista ESPALDA: el lado derecho del paciente se dibuja a la DERECHA del observador.
 */
export type RegionSide = "right" | "left" | "center";

export type RegionGroup =
  | "head_neck"
  | "upper_limb"
  | "trunk"
  | "spine"
  | "lower_limb"
  | "feet";

export type BodyRegion = {
  id: string;
  view: BodyView;
  side: RegionSide;
  group: RegionGroup;
  /** Nombre completo, p. ej. "Hombro derecho (anterior)". */
  label: string;
  /** Nombre corto para chips / tooltips, p. ej. "Hombro der.". */
  short: string;
};

export const REGION_GROUPS: Record<RegionGroup, string> = {
  head_neck: "Cabeza y cuello",
  upper_limb: "Miembro superior",
  trunk: "Tronco",
  spine: "Columna",
  lower_limb: "Miembro inferior",
  feet: "Pies",
};

type Pair = {
  key: string;
  view: BodyView;
  group: RegionGroup;
  /** [derecho, izquierdo] */
  labels: [string, string];
  shorts: [string, string];
};

const pair = (p: Pair): BodyRegion[] => [
  {
    id: p.key.replace("{side}", "right"),
    view: p.view,
    side: "right",
    group: p.group,
    label: p.labels[0],
    short: p.shorts[0],
  },
  {
    id: p.key.replace("{side}", "left"),
    view: p.view,
    side: "left",
    group: p.group,
    label: p.labels[1],
    short: p.shorts[1],
  },
];

const center = (
  id: string,
  view: BodyView,
  group: RegionGroup,
  label: string,
  short: string,
): BodyRegion => ({ id, view, side: "center", group, label, short });

// ---------------------------------------------------------------------------
// Vista FRENTE (anterior)
// ---------------------------------------------------------------------------
const FRONT: BodyRegion[] = [
  center("head_front", "front", "head_neck", "Cabeza (frontal)", "Cabeza"),
  center("face", "front", "head_neck", "Cara / ATM", "Cara / ATM"),
  center("neck_front", "front", "head_neck", "Cuello (anterior)", "Cuello"),
  ...pair({
    key: "shoulder_{side}_front",
    view: "front",
    group: "upper_limb",
    labels: ["Hombro derecho (anterior)", "Hombro izquierdo (anterior)"],
    shorts: ["Hombro der.", "Hombro izq."],
  }),
  ...pair({
    key: "chest_{side}",
    view: "front",
    group: "trunk",
    labels: ["Pectoral derecho", "Pectoral izquierdo"],
    shorts: ["Pectoral der.", "Pectoral izq."],
  }),
  center("abdomen_upper", "front", "trunk", "Abdomen superior", "Abdomen sup."),
  center("abdomen_lower", "front", "trunk", "Abdomen inferior", "Abdomen inf."),
  center("pelvis_front", "front", "trunk", "Pelvis / pubis", "Pelvis"),
  ...pair({
    key: "arm_{side}_front",
    view: "front",
    group: "upper_limb",
    labels: ["Brazo derecho (bíceps)", "Brazo izquierdo (bíceps)"],
    shorts: ["Brazo der.", "Brazo izq."],
  }),
  ...pair({
    key: "elbow_{side}_front",
    view: "front",
    group: "upper_limb",
    labels: ["Codo derecho (pliegue)", "Codo izquierdo (pliegue)"],
    shorts: ["Codo der.", "Codo izq."],
  }),
  ...pair({
    key: "forearm_{side}_front",
    view: "front",
    group: "upper_limb",
    labels: ["Antebrazo derecho (anterior)", "Antebrazo izquierdo (anterior)"],
    shorts: ["Antebrazo der.", "Antebrazo izq."],
  }),
  ...pair({
    key: "wrist_{side}_front",
    view: "front",
    group: "upper_limb",
    labels: ["Muñeca derecha (palmar)", "Muñeca izquierda (palmar)"],
    shorts: ["Muñeca der.", "Muñeca izq."],
  }),
  ...pair({
    key: "hand_{side}_front",
    view: "front",
    group: "upper_limb",
    labels: ["Mano derecha (palma)", "Mano izquierda (palma)"],
    shorts: ["Mano der.", "Mano izq."],
  }),
  ...pair({
    key: "hip_{side}_front",
    view: "front",
    group: "lower_limb",
    labels: ["Cadera / ingle derecha", "Cadera / ingle izquierda"],
    shorts: ["Cadera der.", "Cadera izq."],
  }),
  ...pair({
    key: "thigh_{side}_front",
    view: "front",
    group: "lower_limb",
    labels: ["Muslo derecho (cuádriceps)", "Muslo izquierdo (cuádriceps)"],
    shorts: ["Muslo der.", "Muslo izq."],
  }),
  ...pair({
    key: "knee_{side}_front",
    view: "front",
    group: "lower_limb",
    labels: ["Rodilla derecha", "Rodilla izquierda"],
    shorts: ["Rodilla der.", "Rodilla izq."],
  }),
  ...pair({
    key: "leg_{side}_front",
    view: "front",
    group: "lower_limb",
    labels: ["Pierna derecha (tibial)", "Pierna izquierda (tibial)"],
    shorts: ["Pierna der.", "Pierna izq."],
  }),
  ...pair({
    key: "ankle_{side}_front",
    view: "front",
    group: "feet",
    labels: ["Tobillo derecho", "Tobillo izquierdo"],
    shorts: ["Tobillo der.", "Tobillo izq."],
  }),
  ...pair({
    key: "foot_{side}_front",
    view: "front",
    group: "feet",
    labels: ["Pie derecho (dorso)", "Pie izquierdo (dorso)"],
    shorts: ["Pie der.", "Pie izq."],
  }),
];

// ---------------------------------------------------------------------------
// Vista ESPALDA (posterior)
// ---------------------------------------------------------------------------
const BACK: BodyRegion[] = [
  center("head_back", "back", "head_neck", "Cabeza (occipital)", "Occipital"),
  center("neck_back", "back", "spine", "Columna cervical", "Cervical"),
  ...pair({
    key: "trapezius_{side}",
    view: "back",
    group: "trunk",
    labels: ["Trapecio derecho", "Trapecio izquierdo"],
    shorts: ["Trapecio der.", "Trapecio izq."],
  }),
  ...pair({
    key: "shoulder_{side}_back",
    view: "back",
    group: "upper_limb",
    labels: ["Hombro derecho (posterior)", "Hombro izquierdo (posterior)"],
    shorts: ["Hombro post. der.", "Hombro post. izq."],
  }),
  ...pair({
    key: "scapula_{side}",
    view: "back",
    group: "trunk",
    labels: ["Escápula derecha", "Escápula izquierda"],
    shorts: ["Escápula der.", "Escápula izq."],
  }),
  center("thoracic_spine", "back", "spine", "Columna dorsal", "Dorsal"),
  ...pair({
    key: "lower_back_{side}",
    view: "back",
    group: "trunk",
    labels: ["Lumbar derecha (paravertebral)", "Lumbar izquierda (paravertebral)"],
    shorts: ["Lumbar der.", "Lumbar izq."],
  }),
  center("lumbar_spine", "back", "spine", "Columna lumbar", "Lumbar"),
  center("sacrum", "back", "spine", "Sacro / coxis", "Sacro"),
  ...pair({
    key: "arm_{side}_back",
    view: "back",
    group: "upper_limb",
    labels: ["Brazo derecho (tríceps)", "Brazo izquierdo (tríceps)"],
    shorts: ["Tríceps der.", "Tríceps izq."],
  }),
  ...pair({
    key: "elbow_{side}_back",
    view: "back",
    group: "upper_limb",
    labels: ["Codo derecho (olécranon)", "Codo izquierdo (olécranon)"],
    shorts: ["Codo post. der.", "Codo post. izq."],
  }),
  ...pair({
    key: "forearm_{side}_back",
    view: "back",
    group: "upper_limb",
    labels: ["Antebrazo derecho (posterior)", "Antebrazo izquierdo (posterior)"],
    shorts: ["Antebrazo post. der.", "Antebrazo post. izq."],
  }),
  ...pair({
    key: "wrist_{side}_back",
    view: "back",
    group: "upper_limb",
    labels: ["Muñeca derecha (dorsal)", "Muñeca izquierda (dorsal)"],
    shorts: ["Muñeca post. der.", "Muñeca post. izq."],
  }),
  ...pair({
    key: "hand_{side}_back",
    view: "back",
    group: "upper_limb",
    labels: ["Mano derecha (dorso)", "Mano izquierda (dorso)"],
    shorts: ["Dorso mano der.", "Dorso mano izq."],
  }),
  ...pair({
    key: "gluteal_{side}",
    view: "back",
    group: "lower_limb",
    labels: ["Glúteo derecho", "Glúteo izquierdo"],
    shorts: ["Glúteo der.", "Glúteo izq."],
  }),
  ...pair({
    key: "hamstring_{side}",
    view: "back",
    group: "lower_limb",
    labels: ["Isquiotibiales derecho", "Isquiotibiales izquierdo"],
    shorts: ["Isquios der.", "Isquios izq."],
  }),
  ...pair({
    key: "knee_{side}_back",
    view: "back",
    group: "lower_limb",
    labels: ["Hueco poplíteo derecho", "Hueco poplíteo izquierdo"],
    shorts: ["Poplíteo der.", "Poplíteo izq."],
  }),
  ...pair({
    key: "calf_{side}",
    view: "back",
    group: "lower_limb",
    labels: ["Gemelos derecho", "Gemelos izquierdo"],
    shorts: ["Gemelos der.", "Gemelos izq."],
  }),
  ...pair({
    key: "ankle_{side}_back",
    view: "back",
    group: "feet",
    labels: ["Tobillo / Aquiles derecho", "Tobillo / Aquiles izquierdo"],
    shorts: ["Aquiles der.", "Aquiles izq."],
  }),
  ...pair({
    key: "foot_{side}_back",
    view: "back",
    group: "feet",
    labels: ["Talón / planta derecha", "Talón / planta izquierda"],
    shorts: ["Talón der.", "Talón izq."],
  }),
];

export const BODY_REGIONS: BodyRegion[] = [...FRONT, ...BACK];

export const BODY_REGIONS_BY_ID: Record<string, BodyRegion> = Object.fromEntries(
  BODY_REGIONS.map((r) => [r.id, r]),
);

export function getRegion(id: string | null | undefined): BodyRegion | undefined {
  return id ? BODY_REGIONS_BY_ID[id] : undefined;
}

export function getRegionLabel(id: string | null | undefined, variant: "label" | "short" = "label"): string {
  const region = getRegion(id);
  if (!region) return id ?? "Zona";
  return region[variant];
}

export function regionsForView(view: BodyView): BodyRegion[] {
  return BODY_REGIONS.filter((r) => r.view === view);
}

export function isValidRegion(id: string, view?: BodyView): boolean {
  const region = BODY_REGIONS_BY_ID[id];
  return Boolean(region && (!view || region.view === view));
}
