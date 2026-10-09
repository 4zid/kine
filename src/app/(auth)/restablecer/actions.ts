"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mapAuthError, NETWORK_MESSAGE } from "@/components/auth/auth-errors";
import { isRecentRecoverySession } from "@/components/auth/recovery-session";
import { resetPasswordSchema, toFieldErrors } from "@/components/auth/schemas";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const FALLBACK = "No pudimos guardar la contraseña. Probá de nuevo en unos minutos.";

export type ResetPasswordResult = { linkExpired?: boolean };

/**
 * Guarda la contraseña nueva. Solo vale para la sesión que abrió el link de
 * recuperación, y por poco tiempo: una sesión común tiene que cambiarla desde
 * Ajustes, escribiendo la actual.
 */
export async function updatePassword(
  _prev: ActionState<ResetPasswordResult>,
  formData: FormData,
): Promise<ActionState<ResetPasswordResult>> {
  const password = formData.get("password");
  const confirm = formData.get("confirm");
  const parsed = resetPasswordSchema.safeParse({
    password: typeof password === "string" ? password : "",
    confirm: typeof confirm === "string" ? confirm : "",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims?.sub) {
      return {
        ok: false,
        message: "Tu sesión expiró. Pedí un nuevo link para restablecer la contraseña.",
        data: { linkExpired: true },
      };
    }
    if (!isRecentRecoverySession(data.claims)) {
      return {
        ok: false,
        message: "El link de recuperación venció. Pedí uno nuevo para restablecer la contraseña.",
        data: { linkExpired: true },
      };
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      const mapped = mapAuthError(error, FALLBACK);
      if (mapped.message === FALLBACK) console.error("[updatePassword]", error.code, error.message);
      if (mapped.field === "password") return { ok: false, fieldErrors: { password: mapped.message } };
      return { ok: false, message: mapped.message };
    }

    // Cualquier otra sesión abierta (p. ej. una computadora del consultorio) se cierra.
    const { error: othersError } = await supabase.auth.signOut({ scope: "others" });
    if (othersError) console.error("[updatePassword] signOut others", othersError.code, othersError.message);
  } catch (err) {
    console.error("[updatePassword] error inesperado", err);
    return { ok: false, message: NETWORK_MESSAGE };
  }

  revalidatePath("/", "layout");
  redirect("/inicio?clave=actualizada");
}

/** Cierra la sesión (vencida para recuperar) y lleva a pedir un link nuevo. */
export async function restartRecovery(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch (err) {
    console.error("[restartRecovery] signOut", err);
  }
  revalidatePath("/", "layout");
  redirect("/recuperar");
}
