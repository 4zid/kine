import { FlashToast } from "@/components/patients/flash-toast";
import { PatientSummary } from "@/components/patients/patient-summary";
import { getClinicalHistory, getPatientOrNotFound } from "@/lib/data/patients";
import { getPatientSummary } from "@/lib/data/patients-summary";

export default async function PatientSummaryPage({ params, searchParams }: PageProps<"/pacientes/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const patient = await getPatientOrNotFound(id);
  const [history, summary] = await Promise.all([getClinicalHistory(id), getPatientSummary(id)]);
  const isNew = sp.nuevo === "1";

  return (
    <>
      {isNew ? (
        <FlashToast
          param="nuevo"
          message="Paciente creado"
          description={`${patient.first_name} ya está en tu lista. Seguí con su historia clínica.`}
        />
      ) : null}
      {sp.editado === "1" ? <FlashToast param="editado" message="Datos actualizados" /> : null}
      <PatientSummary patient={patient} history={history} summary={summary} isNew={isNew} />
    </>
  );
}
