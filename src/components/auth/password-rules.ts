/**
 * Reglas de contraseña compartidas por el registro, la recuperación y Ajustes.
 * Sin zod: se puede importar desde cualquier componente cliente sin sumar peso.
 */
export const PASSWORD_MIN = 8;
/** Supabase (bcrypt) ignora lo que pase de 72 caracteres. */
export const PASSWORD_MAX = 72;

/** Fortaleza estimada de una contraseña (0-4) con etiqueta y color. */
export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "var(--color-line-strong)" };
  let points = 0;
  if (password.length >= PASSWORD_MIN) points++;
  if (password.length >= 12) points++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points++;
  if (/\d/.test(password)) points++;
  if (/[^A-Za-z0-9]/.test(password)) points++;
  if (password.length < PASSWORD_MIN) points = Math.min(points, 1);

  const score = Math.min(4, Math.max(1, points)) as 1 | 2 | 3 | 4;
  const map = {
    1: { label: "Débil", color: "var(--color-red)" },
    2: { label: "Aceptable", color: "var(--color-orange)" },
    3: { label: "Buena", color: "var(--color-yellow)" },
    4: { label: "Muy segura", color: "var(--color-green)" },
  } as const;
  return { score, ...map[score] };
}
