import { NextResponse, type NextRequest } from "next/server";
import { siteUrlFromHeaders } from "@/components/auth/site-url";
import { HOME_PATH, safeNextPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino de los links de email con flujo PKCE (confirmación de registro y
 * recuperación de contraseña): canjea `code` por una sesión y redirige a `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = siteUrlFromHeaders(request.headers);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), HOME_PATH);
  const isRecovery = next === "/restablecer" || next.startsWith("/restablecer?");

  const errorCode = searchParams.get("error_code");
  const hasError = Boolean(searchParams.get("error") || errorCode || searchParams.get("error_description"));

  const to = (path: string) => NextResponse.redirect(new URL(path, origin));

  if (code && !hasError) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return to(next);
      console.error("[auth/callback] exchangeCodeForSession", error.code, error.message);
    } catch (err) {
      console.error("[auth/callback] error inesperado", err);
    }
  }

  if (isRecovery) return to("/recuperar?error=link");

  // El email queda confirmado aunque falle el canje PKCE (p. ej. el link se abrió en
  // otro navegador o dispositivo): en ese caso solo falta ingresar.
  if (code) return to("/ingresar?confirmado=1");

  return to(`/ingresar?error=${errorCode === "otp_expired" ? "link_vencido" : "link_invalido"}`);
}
