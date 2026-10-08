import { isAuthRetryableFetchError, isAuthWeakPasswordError, type AuthError } from "@supabase/supabase-js";

export type MappedAuthError = {
  /** Mensaje en español para mostrar al usuario. */
  message: string;
  /** Campo del formulario al que corresponde (si aplica). */
  field?: "email" | "password";
  /** true si el email existe pero no fue confirmado. */
  notConfirmed?: boolean;
};

export const RATE_LIMIT_MESSAGE = "Se alcanzó el límite de envío de emails, probá en unos minutos.";
export const NETWORK_MESSAGE = "No pudimos conectarnos con el servidor. Revisá tu conexión y probá de nuevo.";

/**
 * Traduce los errores de Supabase Auth a mensajes amigables en español.
 * Usa `code` cuando está disponible y el texto como respaldo (versiones viejas de GoTrue).
 */
export function mapAuthError(error: AuthError | null | undefined, fallback: string): MappedAuthError {
  if (!error) return { message: fallback };
  const code = error.code ?? "";
  const text = (error.message ?? "").toLowerCase();

  if (isAuthRetryableFetchError(error) || error.status === 0) {
    return { message: NETWORK_MESSAGE };
  }

  if (code === "user_already_exists" || code === "email_exists" || text.includes("already registered")) {
    return { field: "email", message: "Ya existe una cuenta con este email." };
  }

  if (isAuthWeakPasswordError(error) || code === "weak_password") {
    const pwned = isAuthWeakPasswordError(error) && error.reasons?.includes("pwned");
    return {
      field: "password",
      message: pwned
        ? "Esta contraseña apareció en filtraciones de datos públicas. Elegí otra distinta."
        : "La contraseña es muy débil. Combiná letras, números y símbolos.",
    };
  }

  if (code === "email_address_invalid" || (code === "validation_failed" && text.includes("email")) || text.includes("invalid email")) {
    return { field: "email", message: "El email no es válido. Revisá que esté bien escrito." };
  }

  if (code === "email_address_not_authorized") {
    return { field: "email", message: "No podemos enviar emails a esta dirección todavía. Probá con otra." };
  }

  if (code === "over_email_send_rate_limit" || text.includes("email rate limit exceeded")) {
    return { message: RATE_LIMIT_MESSAGE };
  }

  if (code === "over_request_rate_limit" || error.status === 429) {
    return { message: "Hiciste demasiados intentos seguidos. Esperá unos minutos y volvé a probar." };
  }

  if (code === "invalid_credentials" || text.includes("invalid login credentials")) {
    return { message: "Email o contraseña incorrectos." };
  }

  if (code === "email_not_confirmed" || text.includes("email not confirmed")) {
    return {
      notConfirmed: true,
      message: "Todavía no confirmaste tu email. Revisá tu bandeja de entrada o pedí un nuevo link.",
    };
  }

  if (code === "same_password") {
    return { field: "password", message: "La nueva contraseña tiene que ser distinta de la anterior." };
  }

  if (code === "reauthentication_needed" || code === "reauthentication_not_valid") {
    return { message: "Por seguridad, pedí un nuevo link de recuperación y volvé a intentarlo." };
  }

  if (code === "signup_disabled") {
    return { message: "El registro de cuentas nuevas está deshabilitado temporalmente." };
  }

  if (code === "session_not_found" || code === "session_expired" || code === "refresh_token_not_found") {
    return { message: "Tu sesión expiró. Pedí un nuevo link para continuar." };
  }

  if (code === "user_banned") {
    return { message: "Esta cuenta está suspendida y no puede ingresar." };
  }

  return { message: fallback };
}
