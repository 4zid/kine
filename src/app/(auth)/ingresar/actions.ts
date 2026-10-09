"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mapAuthError, NETWORK_MESSAGE } from "@/components/auth/auth-errors";
import { markOnboardedServer } from "@/components/auth/onboarded-server";
import { internalNextPath } from "@/components/auth/redirects";
import { signInSchema, toFieldErrors } from "@/components/auth/schemas";
import { HOME_PATH } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export type SignInResult = { needsConfirmation?: boolean; email?: string };

const FALLBACK = "No pudimos iniciar sesión. Probá de nuevo en unos minutos.";

function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

/** Ingreso con email y contraseña. Redirige a `next` (ruta interna) si sale bien. */
export async function signIn(_prev: ActionState<SignInResult>, formData: FormData): Promise<ActionState<SignInResult>> {
  const parsed = signInSchema.safeParse({ email: text(formData, "email"), password: text(formData, "password") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const next = internalNextPath(text(formData, "next"), HOME_PATH);
  const supabase = await createClient();

  let error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"];
  try {
    ({ error } = await supabase.auth.signInWithPassword(parsed.data));
  } catch (err) {
    console.error("[signIn] error inesperado", err);
    return { ok: false, message: NETWORK_MESSAGE };
  }

  if (error) {
    const mapped = mapAuthError(error, FALLBACK);
    if (mapped.message === FALLBACK) console.error("[signIn]", error.code, error.message);
    if (mapped.notConfirmed) {
      return { ok: false, message: mapped.message, data: { needsConfirmation: true, email: parsed.data.email } };
    }
    if (mapped.field === "email") {
      return { ok: false, fieldErrors: { email: mapped.message } };
    }
    return { ok: false, message: mapped.message };
  }

  await markOnboardedServer();
  revalidatePath("/", "layout");
  redirect(next);
}
