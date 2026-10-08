/**
 * Sugerencias para los campos de la historia clínica (datalists) y valores
 * de referencia orientativos. Todos los campos siguen siendo texto libre.
 */

export const JOINT_SUGGESTIONS = [
  "Hombro",
  "Codo",
  "Antebrazo",
  "Muñeca",
  "Dedos de la mano",
  "Cadera",
  "Rodilla",
  "Tobillo",
  "Pie",
  "Columna cervical",
  "Columna dorsal",
  "Columna lumbar",
  "ATM",
] as const;

export const MOVEMENT_SUGGESTIONS = [
  "Flexión",
  "Extensión",
  "Abducción",
  "Aducción",
  "Rotación interna",
  "Rotación externa",
  "Rotación",
  "Inclinación lateral",
  "Flexión horizontal",
  "Extensión horizontal",
  "Pronación",
  "Supinación",
  "Desviación radial",
  "Desviación cubital",
  "Dorsiflexión",
  "Flexión plantar",
  "Inversión",
  "Eversión",
  "Apertura bucal",
] as const;

export const MUSCLE_SUGGESTIONS = [
  "Deltoides",
  "Supraespinoso",
  "Infraespinoso",
  "Subescapular",
  "Trapecio",
  "Romboides",
  "Serrato anterior",
  "Pectoral mayor",
  "Dorsal ancho",
  "Bíceps braquial",
  "Tríceps braquial",
  "Flexores de muñeca",
  "Extensores de muñeca",
  "Psoas ilíaco",
  "Glúteo mayor",
  "Glúteo medio",
  "Aductores de cadera",
  "Cuádriceps",
  "Isquiotibiales",
  "Tibial anterior",
  "Tríceps sural",
  "Peroneos",
  "Abdominales",
  "Paravertebrales",
] as const;

export const ACTIVITY_FREQUENCY_CHIPS = [
  "Ocasional",
  "1-2 veces por semana",
  "3-4 veces por semana",
  "Diaria",
] as const;

export const SESSION_FREQUENCY_CHIPS = ["1 vez por semana", "2 veces por semana", "3 veces por semana"] as const;

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Rango articular normal de referencia (AAOS), en grados.
 * Solo combinaciones habituales; se muestra como guía, no como diagnóstico.
 */
const ROM_REFERENCE: Record<string, Record<string, number>> = {
  hombro: {
    flexion: 180,
    extension: 60,
    abduccion: 180,
    "rotacion interna": 70,
    "rotacion externa": 90,
  },
  codo: { flexion: 150 },
  antebrazo: { pronacion: 80, supinacion: 80 },
  muneca: { flexion: 80, extension: 70, "desviacion radial": 20, "desviacion cubital": 30 },
  cadera: {
    flexion: 120,
    extension: 30,
    abduccion: 45,
    aduccion: 30,
    "rotacion interna": 45,
    "rotacion externa": 45,
  },
  rodilla: { flexion: 135 },
  tobillo: { dorsiflexion: 20, "flexion plantar": 50, inversion: 35, eversion: 15 },
  "columna cervical": { flexion: 45, extension: 45, "inclinacion lateral": 45, rotacion: 60 },
};

export function romReference(joint: string, movement: string): number | null {
  const j = normalize(joint);
  const m = normalize(movement);
  if (!j || !m) return null;
  const table = ROM_REFERENCE[j];
  return table?.[m] ?? null;
}

/** Puntaje máximo habitual de escalas conocidas (para autocompletar "Máximo"). */
const SCALE_MAX: Record<string, number> = {
  "oswestry (odi)": 100,
  "roland-morris": 24,
  "neck disability index (ndi)": 50,
  dash: 100,
  quickdash: 100,
  womac: 96,
  koos: 100,
  lysholm: 100,
  lefs: 80,
  berg: 56,
  tinetti: 28,
  barthel: 100,
  spadi: 100,
};

export function scaleMaxFor(name: string): number | null {
  return SCALE_MAX[normalize(name)] ?? null;
}
