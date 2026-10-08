import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import type { ClinicalHistory, Patient } from "@/lib/types";

/** Paciente por id (la RLS garantiza que sea del profesional logueado). Deduplicado por request. */
export const getPatient = cache(async (id: string): Promise<Patient | null> => {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
  return data;
});

/** Igual que getPatient pero responde 404 si no existe o no pertenece al profesional. */
export async function getPatientOrNotFound(id: string): Promise<Patient> {
  const patient = await getPatient(id);
  if (!patient) notFound();
  return patient;
}

/** Historia clínica del paciente (1:1). Deduplicado por request. */
export const getClinicalHistory = cache(async (patientId: string): Promise<ClinicalHistory | null> => {
  if (!isUuid(patientId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("clinical_histories").select("*").eq("patient_id", patientId).maybeSingle();
  return data;
});
