"use server";

import { mapAuthError, NETWORK_MESSAGE } from "@/components/auth/auth-errors";
import { emailSchema } from "@/components/auth/schemas";
import { getSiteUrl } from "@/components/auth/site-url";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const FALLBACK = "No pudimos reenviar el email. Probá de nuevo en unos minutos.";

/** Reenvía el email de confirmación de registro. */
export async function resendConfirmation(rawEmail: string): Promise<ActionState> {
  const parsed = emailSchema.safeParse(typeof rawEmail === "string" ? rawEmail : "");
  if (!parsed.success) {
    return { ok: false, fieldErrors: { email: parsed.error.issues[0]?.message ?? "Ingresá un email válido." } };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const next = encodeURIComponent("/inicio?bienvenida=1");

  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data,
      options: { emailRedirectTo: `${siteUrl}/auth/callback?next=${next}` },
    });
    if (error) {
      const mapped = mapAuthError(error, FALLBACK);
      if (mapped.message === FALLBACK) console.error("[resendConfirmation]", error.code, error.message);
      return { ok: false, message: mapped.message };
    }
  } catch (err) {
    console.error("[resendConfirmation] error inesperado", err);
    return { ok: false, message: NETWORK_MESSAGE };
  }

  return { ok: true, message: "Listo, te reenviamos el email de confirmación." };
}
