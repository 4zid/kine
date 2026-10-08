"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/auth";
import type { ActionState } from "@/lib/types";
import { isUuid, todayISO } from "@/lib/utils";
import { parseSessionForm } from "@/components/sessions/session-schema";

type DbError = { code?: string; message?: string } | null;

const SESSION_EXPIRED: ActionState = { ok: false, message: "Tu sesión expiró. Volvé a ingresar para guardar." };

function dbErrorMessage(error: DbError): string {
  switch (error?.code) {
    case "23503":
      return "No encontramos al paciente o no tenés acceso a su ficha.";
    case "23514":
    case "22P02":
    case "22007":
    case "22008":
      return "Hay datos con un formato no válido. Revisalos y probá de nuevo.";
    case "42501":
      return "No tenés permiso para modificar esta sesión.";
    case "23505":
      return "Esta sesión ya estaba registrada.";
    default:
      return "No pudimos guardar la sesión. Probá de nuevo en unos segundos.";
  }
}

async function context() {
  try {
    return await getActionContext();
  } catch {
    return null;
  }
}

function revalidateSessionPaths(patientId: string) {
  revalidatePath(`/pacientes/${patientId}`, "layout");
  revalidatePath(`/pacientes/${patientId}/sesiones`);
  revalidatePath(`/pacientes/${patientId}/informe`);
  revalidatePath("/inicio");
  // La barra lateral muestra la última sesión de cada paciente.
  revalidatePath("/", "layout");
}

/** Crea una sesión para el paciente. Uso: `createSession.bind(null, patientId)` con useActionState. */
export async function createSession(patientId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isUuid(patientId)) return { ok: false, message: "Paciente no válido." };
  const ctx = await context();
  if (!ctx) return SESSION_EXPIRED;

  const parsed = parseSessionForm(formData, todayISO());
  if (!parsed.ok) return { ok: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { error } = await ctx.supabase
    .from("treatment_sessions")
    .insert({ ...parsed.data, patient_id: patientId })
    .select("id")
    .single();
  if (error) return { ok: false, message: dbErrorMessage(error) };

  revalidateSessionPaths(patientId);
  redirect(`/pacientes/${patientId}/sesiones?guardada=1`);
}

/** Actualiza una sesión. Uso: `updateSession.bind(null, patientId, sessionId)` con useActionState. */
export async function updateSession(
  patientId: string,
  sessionId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isUuid(patientId) || !isUuid(sessionId)) return { ok: false, message: "Sesión no válida." };
  const ctx = await context();
  if (!ctx) return SESSION_EXPIRED;

  const parsed = parseSessionForm(formData, todayISO());
  if (!parsed.ok) return { ok: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { data, error } = await ctx.supabase
    .from("treatment_sessions")
    .update(parsed.data)
    .eq("id", sessionId)
    .eq("patient_id", patientId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (!data) return { ok: false, message: "No encontramos la sesión. Puede que se haya eliminado." };

  revalidateSessionPaths(patientId);
  redirect(`/pacientes/${patientId}/sesiones?guardada=1`);
}

/** Elimina una sesión (los registros de dolor vinculados quedan, sin sesión asociada). */
export async function deleteSession(patientId: string, sessionId: string): Promise<ActionState> {
  if (!isUuid(patientId) || !isUuid(sessionId)) return { ok: false, message: "Sesión no válida." };
  const ctx = await context();
  if (!ctx) return SESSION_EXPIRED;

  const { data, error } = await ctx.supabase
    .from("treatment_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("patient_id", patientId)
    .select("id");
  if (error) return { ok: false, message: "No pudimos eliminar la sesión. Probá de nuevo." };
  if (!data || data.length === 0) return { ok: false, message: "La sesión ya no existe." };

  revalidateSessionPaths(patientId);
  return { ok: true, message: "Sesión eliminada" };
}
