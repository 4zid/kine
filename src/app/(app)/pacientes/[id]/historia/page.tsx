import type { Metadata } from "next";
import { ClinicalHistoryForm } from "@/components/clinical-history/clinical-history-form";
import { historyToFormValues } from "@/components/clinical-history/schema";
import { getClinicalHistory, getPatient, getPatientOrNotFound } from "@/lib/data/patients";
import { createClient } from "@/lib/supabase/server";
import type { ClinicalHistory } from "@/lib/types";
import { formatDateTime, fullName, isUuid, todayISO } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/pacientes/[id]/historia">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient ? `Historia clínica · ${fullName(patient)}` : "Historia clínica" };
}

/**
 * Historia del paciente, o null SOLO si la fila realmente no existe.
 * Un error de lectura nunca debe terminar en un formulario vacío: al guardarlo se pisaría la
 * historia existente. Si la consulta falla, se lanza y se muestra el error.tsx de la pestaña.
 */
async function loadClinicalHistory(patientId: string): Promise<ClinicalHistory | null> {
  if (!isUuid(patientId)) return null;
  const history = await getClinicalHistory(patientId);
  if (history) return history;
  // getClinicalHistory puede devolver null ante un error: confirmarlo con una consulta propia.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinical_histories")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();
  if (error) {
    console.error("loadClinicalHistory", error.code, error.message);
    throw new Error("No pudimos cargar la historia clínica.");
  }
  return data;
}

export default async function ClinicalHistoryPage({ params }: PageProps<"/pacientes/[id]/historia">) {
  const { id } = await params;
  // La fila se crea por trigger al dar de alta al paciente; si faltara, el guardado la inserta.
  const [patient, history] = await Promise.all([getPatientOrNotFound(id), loadClinicalHistory(id)]);

  const wasEdited = history != null && history.updated_at !== history.created_at;

  return (
    <ClinicalHistoryForm
      key={patient.id}
      patientId={patient.id}
      initialValues={historyToFormValues(history)}
      loadedUpdatedAt={history?.updated_at ?? null}
      lastUpdatedLabel={wasEdited ? formatDateTime(history.updated_at) : null}
      today={todayISO()}
    />
  );
}
