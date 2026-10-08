"use server";

import { NETWORK_MESSAGE, RATE_LIMIT_MESSAGE, mapAuthError } from "@/components/auth/auth-errors";
import { recoverSchema, toFieldErrors } from "@/components/auth/schemas";
import { getSiteUrl } from "@/components/auth/site-url";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export type RecoverResult = { email: string };

/**
 * Pide el link para restablecer la contraseña. La respuesta es neutra: no revela
 * si existe una cuenta con ese email.
 */
export async function requestPasswordReset(
  _prev: ActionState<RecoverResult>,
  formData: FormData,
): Promise<ActionState<RecoverResult>> {
  const raw = formData.get("email");
  const parsed = recoverSchema.safeParse({ email: typeof raw === "string" ? raw : "" });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const { email } = parsed.data;
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/restablecer`,
    });
    if (error) {
      const mapped = mapAuthError(error, "");
      // Solo informamos problemas que no revelan nada sobre la cuenta.
      if (mapped.message === RATE_LIMIT_MESSAGE || mapped.message === NETWORK_MESSAGE || error.status === 429) {
        return { ok: false, message: mapped.message || RATE_LIMIT_MESSAGE };
      }
      console.error("[requestPasswordReset]", error.code, error.message);
    }
  } catch (err) {
    console.error("[requestPasswordReset] error inesperado", err);
    return { ok: false, message: NETWORK_MESSAGE };
  }

  return { ok: true, data: { email } };
}
