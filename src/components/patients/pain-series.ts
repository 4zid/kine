/**
 * Series del gráfico de evolución del dolor. En un módulo aparte (sin "use client") para que
 * los Server Components puedan leerlas (p. ej. para la leyenda).
 * Colores validados: ΔE CVD 34 entre sí y contraste ≥ 3:1 sobre blanco.
 */
import { PAIN_SERIES } from "@/lib/constants";

export { PAIN_SERIES };

export type PainSeriesKey = keyof typeof PAIN_SERIES;

export const PAIN_SERIES_KEYS: PainSeriesKey[] = ["before", "after"];
