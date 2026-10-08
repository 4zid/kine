import type { Metadata } from "next";
import { ClinicalAlerts } from "@/components/patients/clinical-alerts";
import { clinicalAlerts } from "@/components/patients/format";
import { PatientHeader } from "@/components/patients/patient-header";
import { PatientTabs } from "@/components/patients/patient-tabs";
import { getClinicalHistory, getPatient } from "@/lib/data/patients";
import { fullName } from "@/lib/utils";

export async function generateMetadata({ params }: LayoutProps<"/pacientes/[id]">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient ? fullName(patient) : "Paciente no encontrado" };
}

/**
 * Cromo del paciente compartido por todas las pestañas: encabezado, alertas clínicas y pestañas.
 *
 * Si el paciente no existe (o no es del profesional) NO llamamos a notFound() acá: un not-found.tsx
 * nunca atrapa el notFound() de su propio layout. Renderizamos solo {children}; cada página llama a
 * getPatientOrNotFound(id) (deduplicado con cache) y así responde [id]/not-found.tsx dentro del AppShell.
 */
export default async function PatientLayout({ children, params }: LayoutProps<"/pacientes/[id]">) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) return children;

  const history = await getClinicalHistory(id);

  return (
    <div className="flex flex-col gap-6">
      <PatientHeader patient={patient} />
      <ClinicalAlerts alerts={clinicalAlerts(history)} historyHref={`/pacientes/${id}/historia`} />
      <PatientTabs patientId={id} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
