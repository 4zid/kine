/**
 * Canal de contacto para pedidos sobre datos personales (acceso, rectificación,
 * supresión, copia de registros, cierre de cuenta). Se configura con
 * NEXT_PUBLIC_CONTACT_EMAIL; mientras no exista, los textos remiten a "soporte de kine".
 */
const raw = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

export const CONTACT_EMAIL: string | null = raw && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(raw) ? raw : null;
