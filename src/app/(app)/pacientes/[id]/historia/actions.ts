"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth";
import type { ActionState } from "@/lib/types";
import { formatDateTime, isUuid } from "@/lib/utils";
import {
  historyToFormValues,
  validateHistory,
  type HistoryFormValues,
  type SaveHistoryResult,
} from "@/components/clinical-history/schema";

/**
 * Guarda la historia clínica completa del paciente.
 * Recibe los valores crudos del formulario: se normalizan y validan acá
 * (el cliente valida igual para dar feedback inmediato, pero no se confía en él).
 */
export async function saveClinicalHistory(
  patientId: string,
  input: HistoryFormValues,
): Promise<ActionState<SaveHistoryResult>> {
  let ctx: Awaited<ReturnType<typeof getActionContext>>;
  try {
    ctx = await getActionContext();
  } catch {
    return { ok: false, message: "Tu sesión expiró. Volvé a ingresar para guardar los cambios." };
  }
  const { supabase } = ctx;

  if (!isUuid(patientId)) return { ok: false, message: "No encontramos al paciente." };

  const result = validateHistory(input);
  if (!result.ok) {
    return { ok: false, message: "Revisá los campos marcados antes de guardar.", fieldErrors: result.fieldErrors };
  }

  // La RLS ya limita al profesional logueado; verificamos igual que el paciente exista y sea suyo.
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .maybeSingle();
  if (patientError) return { ok: false, message: "No pudimos verificar al paciente. Intentá de nuevo." };
  if (!patient) return { ok: false, message: "No encontramos al paciente." };

  // La fila se crea por trigger al dar de alta al paciente; el upsert cubre filas faltantes.
  const { data, error } = await supabase
    .from("clinical_histories")
    .upsert({ patient_id: patientId, ...result.data }, { onConflict: "patient_id" })
    .select("*")
    .single();

  if (error || !data) {
    console.error("saveClinicalHistory", error);
    const message =
      error?.code === "23514"
        ? "Hay un valor fuera de rango. Revisá los datos e intentá de nuevo."
        : error?.code === "23503" || error?.code === "42501"
          ? "No tenés permiso para editar la historia de este paciente."
          : "No pudimos guardar la historia clínica. Intentá de nuevo.";
    return { ok: false, message };
  }

  // El encabezado del paciente muestra alertas: refrescar todo lo que cuelga de su layout.
  revalidatePath("/pacientes/[id]", "layout");

  return {
    ok: true,
    message: "Historia clínica guardada",
    data: { values: historyToFormValues(data), updatedLabel: formatDateTime(data.updated_at) },
  };
}
