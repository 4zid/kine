/**
 * Una sesión "de recuperación" es la que abre el link de "Olvidé mi contraseña".
 * GoTrue lo deja asentado en el claim `amr` del JWT: `{ method: "recovery", timestamp }`
 * (versiones anteriores usaban `otp`). Solo esa sesión, y por poco tiempo, puede
 * fijar una contraseña nueva sin escribir la actual.
 */
export const RECOVERY_WINDOW_SECONDS = 30 * 60;

const RECOVERY_METHODS = new Set(["recovery", "otp"]);

export function isRecentRecoverySession(
  claims: { amr?: unknown } | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  const amr = claims?.amr;
  if (!Array.isArray(amr)) return false;
  return amr.some((entry: unknown) => {
    // Formato RFC-8176 (lista de strings, p. ej. con hooks personalizados): sin fecha.
    if (typeof entry === "string") return RECOVERY_METHODS.has(entry);
    if (!entry || typeof entry !== "object") return false;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    if (typeof method !== "string" || !RECOVERY_METHODS.has(method) || typeof timestamp !== "number") return false;
    const age = nowSeconds - timestamp;
    // Tolerancia de 5 min por diferencias de reloj.
    return age <= RECOVERY_WINDOW_SECONDS && age >= -300;
  });
}
