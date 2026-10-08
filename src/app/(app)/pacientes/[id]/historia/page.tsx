import type { Metadata } from "next";
import { ClinicalHistoryForm } from "@/components/clinical-history/clinical-history-form";
import { historyToFormValues } from "@/components/clinical-history/schema";
import { getClinicalHistory, getPatient, getPatientOrNotFound } from "@/lib/data/patients";
import { formatDateTime, fullName, todayISO } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/pacientes/[id]/historia">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient ? `Historia clínica · ${fullName(patient)}` : "Historia clínica" };
}

export default async function ClinicalHistoryPage({ params }: PageProps<"/pacientes/[id]/historia">) {
  const { id } = await params;
  // La fila se crea por trigger al dar de alta al paciente; si faltara, se guarda con upsert.
  const [patient, history] = await Promise.all([getPatientOrNotFound(id), getClinicalHistory(id)]);

  const wasEdited = history != null && history.updated_at !== history.created_at;

  return (
    <ClinicalHistoryForm
      key={patient.id}
      patientId={patient.id}
      initialValues={historyToFormValues(history)}
      lastUpdatedLabel={wasEdited ? formatDateTime(history.updated_at) : null}
      today={todayISO()}
    />
  );
}
