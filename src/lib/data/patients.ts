import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import type { ClinicalHistory, Patient } from "@/lib/types";

/**
 * Paciente por id (la RLS garantiza que sea del profesional logueado). Deduplicado por request.
 * Devuelve null solo si no existe (o no es propio). Si la consulta falla, lanza: un error de red
 * no debe mostrarse como "Paciente no encontrado" (lo atrapa el error.tsx de la ruta).
 */
export const getPatient = cache(async (id: string): Promise<Patient | null> => {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("getPatient", error.code, error.message);
    throw new Error("No pudimos cargar los datos del paciente.", { cause: error });
  }
  return data;
});

/** Igual que getPatient pero responde 404 si no existe o no pertenece al profesional. */
export async function getPatientOrNotFound(id: string): Promise<Patient> {
  const patient = await getPatient(id);
  if (!patient) notFound();
  return patient;
}

/**
 * Historia clínica del paciente (1:1). Deduplicado por request.
 * Lanza si la consulta falla: devolver null mostraría un formulario vacío que, al guardarse,
 * pisaría la historia existente, y ocultaría alergias y contraindicaciones en los avisos.
 */
export const getClinicalHistory = cache(async (patientId: string): Promise<ClinicalHistory | null> => {
  if (!isUuid(patientId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("clinical_histories").select("*").eq("patient_id", patientId).maybeSingle();
  if (error) {
    console.error("getClinicalHistory", error.code, error.message);
    throw new Error("No pudimos cargar la historia clínica.", { cause: error });
  }
  return data;
});
