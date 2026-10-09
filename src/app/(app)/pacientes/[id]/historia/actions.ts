"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth";
import type { ClinicalHistory } from "@/lib/types";
import { formatDateTime, isUuid } from "@/lib/utils";
import {
  historyToFormValues,
  validateHistory,
  type HistoryFormValues,
  type SaveHistoryOutcome,
} from "@/components/clinical-history/schema";

/** `updated_at` tal como lo devuelve PostgREST ("2026-10-08T15:59:35.123456+00:00"). */
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:?\d{2})?)$/;

const CONFLICT_MESSAGE =
  "La historia clínica cambió en otra pestaña o dispositivo. Recargá para ver la última versión: tus cambios siguen en pantalla para que los copies.";

function dbErrorMessage(code: string | undefined): string {
  if (code === "23514") return "Hay un valor fuera de rango. Revisá los datos e intentá de nuevo.";
  if (code === "23503" || code === "42501") return "No tenés permiso para editar la historia de este paciente.";
  return "No pudimos guardar la historia clínica. Intentá de nuevo.";
}

/**
 * Guarda la historia clínica completa del paciente.
 * Recibe los valores crudos del formulario: se normalizan y validan acá
 * (el cliente valida igual para dar feedback inmediato, pero no se confía en él).
 *
 * Concurrencia optimista: `expectedUpdatedAt` es el `updated_at` de la versión que cargó el
 * formulario. Solo se actualiza si la fila sigue en esa versión; si otra pestaña o dispositivo
 * guardó antes, no se pisa nada y se devuelve `conflict`. `null` = no había fila al cargar
 * (se inserta; si ya existe, también es conflicto).
 */
export async function saveClinicalHistory(
  patientId: string,
  input: HistoryFormValues,
  expectedUpdatedAt: string | null,
): Promise<SaveHistoryOutcome> {
  let ctx: Awaited<ReturnType<typeof getActionContext>>;
  try {
    ctx = await getActionContext();
  } catch {
    return { ok: false, message: "Tu sesión expiró. Volvé a ingresar para guardar." };
  }
  const { supabase } = ctx;

  if (!isUuid(patientId)) return { ok: false, message: "No encontramos al paciente." };
  if (expectedUpdatedAt !== null && (typeof expectedUpdatedAt !== "string" || !TIMESTAMP_RE.test(expectedUpdatedAt))) {
    // Cliente desactualizado (p. ej. una pestaña abierta antes de una actualización de la app).
    return { ok: false, conflict: true, message: "Recargá la página para guardar la historia clínica." };
  }

  const result = validateHistory(input);
  if (!result.ok) {
    return { ok: false, message: "Revisá los campos marcados antes de guardar.", fieldErrors: result.fieldErrors };
  }

  try {
    // La RLS ya limita al profesional logueado; verificamos igual que el paciente exista y sea suyo.
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .maybeSingle();
    if (patientError) return { ok: false, message: "No pudimos verificar al paciente. Intentá de nuevo." };
    if (!patient) return { ok: false, message: "No encontramos al paciente." };

    let saved: ClinicalHistory | null;
    if (expectedUpdatedAt === null) {
      // No había fila al cargar (normalmente la crea un trigger): insertar, nunca pisar.
      const { data, error } = await supabase
        .from("clinical_histories")
        .insert({ patient_id: patientId, ...result.data })
        .select("*")
        .maybeSingle();
      if (error?.code === "23505") return { ok: false, conflict: true, message: CONFLICT_MESSAGE };
      if (error) {
        console.error("saveClinicalHistory insert", error.code, error.message);
        return { ok: false, message: dbErrorMessage(error.code) };
      }
      saved = data;
    } else {
      const { data, error } = await supabase
        .from("clinical_histories")
        .update(result.data)
        .eq("patient_id", patientId)
        .eq("updated_at", expectedUpdatedAt)
        .select("*")
        .maybeSingle();
      if (error) {
        console.error("saveClinicalHistory update", error.code, error.message);
        return { ok: false, message: dbErrorMessage(error.code) };
      }
      // 0 filas: alguien guardó otra versión después de que se cargó este formulario.
      if (!data) return { ok: false, conflict: true, message: CONFLICT_MESSAGE };
      saved = data;
    }

    if (!saved) return { ok: false, message: "No pudimos guardar la historia clínica. Intentá de nuevo." };

    // El encabezado del paciente muestra alertas: refrescar todo lo que cuelga de su layout.
    revalidatePath("/pacientes/[id]", "layout");

    return {
      ok: true,
      message: "Historia clínica guardada",
      data: {
        values: historyToFormValues(saved),
        updatedLabel: formatDateTime(saved.updated_at),
        updatedAt: saved.updated_at,
      },
    };
  } catch (error) {
    console.error("saveClinicalHistory", error);
    return { ok: false, message: "No pudimos guardar la historia clínica. Revisá tu conexión e intentá de nuevo." };
  }
}
