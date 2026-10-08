"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

async function contextOrNull() {
  try {
    return await getActionContext();
  } catch {
    return null;
  }
}

/** Oculta la guía "Primeros pasos" marcando el onboarding como completado. */
export async function completeOnboarding(): Promise<ActionState> {
  const ctx = await contextOrNull();
  if (!ctx) return { ok: false, message: "Tu sesión expiró. Volvé a ingresar." };
  const { supabase, userId } = ctx;

  const { data, error } = await supabase
    .from("professionals")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("completeOnboarding", error.code, error.message);
    return { ok: false, message: "No pudimos ocultar la guía. Probá de nuevo." };
  }
  if (!data) return { ok: false, message: "No encontramos tu perfil. Volvé a ingresar." };

  revalidatePath("/inicio");
  return { ok: true, message: "Listo. Podés completar tu perfil cuando quieras desde Ajustes." };
}
