"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mapAuthError, NETWORK_MESSAGE } from "@/components/auth/auth-errors";
import { resetPasswordSchema, toFieldErrors } from "@/components/auth/schemas";
import { getActionContext } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const FALLBACK = "No pudimos guardar la contraseña. Probá de nuevo en unos minutos.";

/** Guarda la contraseña nueva (requiere la sesión abierta por el link de recuperación). */
export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let supabase: Awaited<ReturnType<typeof getActionContext>>["supabase"];
  try {
    ({ supabase } = await getActionContext());
  } catch {
    return { ok: false, message: "Tu sesión expiró. Pedí un nuevo link para restablecer la contraseña." };
  }

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
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      const mapped = mapAuthError(error, FALLBACK);
      if (mapped.message === FALLBACK) console.error("[updatePassword]", error.code, error.message);
      if (mapped.field === "password") return { ok: false, fieldErrors: { password: mapped.message } };
      return { ok: false, message: mapped.message };
    }
  } catch (err) {
    console.error("[updatePassword] error inesperado", err);
    return { ok: false, message: NETWORK_MESSAGE };
  }

  revalidatePath("/", "layout");
  redirect("/inicio?clave=actualizada");
}
