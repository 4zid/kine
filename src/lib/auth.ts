import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_PATH } from "@/lib/routes";
import type { ActionState, Professional } from "@/lib/types";

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

/** Error al cargar el perfil con una sesión válida (base caída, usuario borrado, etc.). */
export class ProfileUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("No pudimos cargar tu perfil profesional.", { cause });
    this.name = "ProfileUnavailableError";
  }
}

/**
 * Perfil del profesional logueado (null si no hay sesión o todavía no tiene perfil).
 * Lanza si la consulta falla: un error de la base no es lo mismo que "no existe".
 * Deduplicado por request.
 */
export const getCurrentProfessional = cache(async (): Promise<Professional | null> => {
  const claims = await getClaims();
  if (!claims?.sub) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("professionals").select("*").eq("id", claims.sub).maybeSingle();
  if (error) {
    console.error("getCurrentProfessional", error.code, error.message);
    throw new ProfileUnavailableError(error);
  }
  return data;
});

/**
 * Exige sesión y devuelve el perfil del profesional.
 * Sin sesión redirige al login. Con sesión válida pero sin poder cargar/crear el perfil
 * lanza un error (lo muestra global-error con "Reintentar" / "Cerrar sesión"): redirigir
 * al login generaría un bucle, porque el proxy devuelve a /inicio a quien tiene sesión.
 */
export async function requireProfessional(): Promise<Professional> {
  const userId = await requireUserId();
  const professional = await getCurrentProfessional();
  if (professional) return professional;

  // El trigger crea el perfil al registrarse; si faltara, lo creamos vacío.
  const supabase = await createClient();
  const claims = await getClaims();
  const { data, error } = await supabase
    .from("professionals")
    .upsert({ id: userId, email: (claims?.email as string | undefined) ?? "" }, { onConflict: "id" })
    .select("*")
    .single();
  if (error || !data) {
    console.error("requireProfessional upsert", error?.code, error?.message);
    throw new ProfileUnavailableError(error);
  }
  return data;
}

/**
 * Para Server Actions: devuelve { supabase, userId } o lanza si no hay sesión.
 * Las políticas RLS garantizan además que solo se toquen filas propias.
 * Preferí `getActionContextOrNull()` + `SESSION_EXPIRED_STATE` para no lanzar al cliente.
 */
export async function getActionContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No autenticado");
  return { supabase, userId };
}

/** Igual que getActionContext pero devuelve null (sesión vencida o error de red) en lugar de lanzar. */
export async function getActionContextOrNull() {
  try {
    return await getActionContext();
  } catch {
    return null;
  }
}

/** Mensaje estándar cuando una acción se ejecuta con la sesión vencida. */
export const SESSION_EXPIRED_MESSAGE = "Tu sesión expiró. Volvé a ingresar para guardar.";

/** ActionState estándar para sesión vencida (las acciones nunca deben lanzar por esto). */
export const SESSION_EXPIRED_STATE: ActionState<never> = { ok: false, message: SESSION_EXPIRED_MESSAGE };
