import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { siteUrlFromHeaders } from "@/components/auth/site-url";
import { HOME_PATH, safeNextPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

function isOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Verificación por `token_hash` (plantillas de email con
 * `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...`).
 * Funciona aunque el link se abra en otro dispositivo (no depende de PKCE).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = siteUrlFromHeaders(request.headers);
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const type = isOtpType(rawType) ? rawType : null;
  const fallback =
    type === "recovery" ? "/restablecer" : type === "signup" || type === "email" ? `${HOME_PATH}?bienvenida=1` : HOME_PATH;
  const next = safeNextPath(searchParams.get("next"), fallback);

  const to = (path: string) => NextResponse.redirect(new URL(path, origin));

  if (tokenHash && type) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return to(next);
      console.error("[auth/confirm] verifyOtp", error.code, error.message);
    } catch (err) {
      console.error("[auth/confirm] error inesperado", err);
    }
  }

  if (type === "recovery") return to("/recuperar?error=link");
  return to("/ingresar?error=link_invalido");
}
