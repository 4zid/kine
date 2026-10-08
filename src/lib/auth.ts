import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_PATH } from "@/lib/routes";
import type { Professional } from "@/lib/types";

/** Claims del JWT del usuario actual (verificados), o null. Deduplicado por request. */
export const getClaims = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  return error || !data ? null : data.claims;
});

/** Exige sesión. Devuelve el id del usuario (= id del profesional). */
export async function requireUserId(): Promise<string> {
  const claims = await getClaims();
  if (!claims?.sub) redirect(LOGIN_PATH);
  return claims.sub;
}

/** Perfil del profesional logueado. Deduplicado por request. */
export const getCurrentProfessional = cache(async (): Promise<Professional | null> => {
  const claims = await getClaims();
  if (!claims?.sub) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("professionals").select("*").eq("id", claims.sub).maybeSingle();
  return data;
});

/** Exige sesión y devuelve el perfil del profesional (redirige al login si no hay). */
export async function requireProfessional(): Promise<Professional> {
  const userId = await requireUserId();
  const professional = await getCurrentProfessional();
  if (!professional) {
    // El trigger crea el perfil al registrarse; si faltara, lo creamos vacío.
    const supabase = await createClient();
    const claims = await getClaims();
    const { data } = await supabase
      .from("professionals")
      .upsert({ id: userId, email: (claims?.email as string | undefined) ?? "" }, { onConflict: "id" })
      .select("*")
      .single();
    if (!data) redirect(LOGIN_PATH);
    return data;
  }
  return professional;
}

/**
 * Para Server Actions: devuelve { supabase, userId } o lanza si no hay sesión.
 * Las políticas RLS garantizan además que solo se toquen filas propias.
 */
export async function getActionContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No autenticado");
  return { supabase, userId };
}
