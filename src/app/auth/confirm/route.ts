import { NextResponse, type NextRequest } from "next/server";
import {
  confirmPagePath,
  defaultNextFor,
  isTokenHash,
  linkErrorPath,
  parseEmailLinkType,
} from "@/components/auth/email-link";
import { internalNextPath, isInternalPath } from "@/components/auth/redirects";
import { siteUrlFromHeaders } from "@/components/auth/site-url";
import { HOME_PATH } from "@/lib/routes";

/**
 * Links de email con `token_hash` (plantillas de Supabase Auth con
 * `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...`).
 * Funcionan aunque el link se abra en otro dispositivo (no dependen de PKCE).
 *
 * Un GET nunca verifica el token: si lo hiciera, cualquier link (o un escáner de
 * correo que lo abre por adelantado) podría iniciar sesión en la cuenta de otra
 * persona sin que el usuario lo note, o consumir el token antes de tiempo.
 * Redirigimos a la pantalla intermedia /auth/confirmar, que verifica recién
 * cuando la persona toca "Confirmar" (POST).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = siteUrlFromHeaders(request.headers);
  const to = (path: string) => {
    const url = new URL(isInternalPath(path) ? path : HOME_PATH, origin);
    const res = NextResponse.redirect(url.origin === new URL(origin).origin ? url : new URL(HOME_PATH, origin), 303);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  };

  const type = parseEmailLinkType(searchParams.get("type"));
  const tokenHash = searchParams.get("token_hash");
  if (!type || !isTokenHash(tokenHash)) {
    return to(linkErrorPath(type, searchParams.get("error_code")));
  }

  const next = internalNextPath(searchParams.get("next"), defaultNextFor(type));
  return to(confirmPagePath({ tokenHash, type, next }));
}
