import type { EmailOtpType } from "@supabase/supabase-js";
import { HOME_PATH } from "@/lib/routes";

/**
 * Links de email con `token_hash` (plantillas de Supabase Auth que apuntan a
 * `/auth/confirm`). Solo aceptamos los tipos que usa el producto: confirmación de
 * registro, recuperación de contraseña y cambio de email. (`magiclink` e `invite`
 * no se ofrecen, así que no se aceptan.)
 */
export const EMAIL_LINK_TYPES = ["signup", "email", "recovery", "email_change"] as const satisfies readonly EmailOtpType[];

export type EmailLinkType = (typeof EMAIL_LINK_TYPES)[number];

export function parseEmailLinkType(value: string | null | undefined): EmailLinkType | null {
  return value && (EMAIL_LINK_TYPES as readonly string[]).includes(value) ? (value as EmailLinkType) : null;
}

/** El token_hash de GoTrue es hex (sha224), con prefijo `pkce_` en el flujo PKCE. */
const TOKEN_HASH_RE = /^[A-Za-z0-9_-]{20,128}$/;

export function isTokenHash(value: string | null | undefined): value is string {
  return typeof value === "string" && TOKEN_HASH_RE.test(value);
}

/** Destino por defecto después de verificar cada tipo de link. */
export function defaultNextFor(type: EmailLinkType): string {
  if (type === "recovery") return "/restablecer";
  if (type === "signup" || type === "email") return `${HOME_PATH}?bienvenida=1`;
  return HOME_PATH;
}

/** Pantalla que explica un link inválido o vencido, según el tipo. */
export function linkErrorPath(type: EmailLinkType | null, errorCode?: string | null): string {
  const expired = errorCode === "otp_expired";
  if (type === "recovery") return `/recuperar?error=${expired ? "vencido" : "link"}`;
  return `/ingresar?error=${expired ? "link_vencido" : "link_invalido"}`;
}

/** URL de la pantalla intermedia "Confirmar" (la verificación se hace recién al tocar el botón). */
export function confirmPagePath(params: { tokenHash: string; type: EmailLinkType; next: string }): string {
  const sp = new URLSearchParams({ token_hash: params.tokenHash, type: params.type, next: params.next });
  return `/auth/confirmar?${sp.toString()}`;
}
