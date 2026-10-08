import type { Metadata } from "next";
import { PatientForm } from "@/components/patients/patient-form";
import { getPatient, getPatientOrNotFound } from "@/lib/data/patients";
import { fullName, todayISO } from "@/lib/utils";
import { updatePatient } from "../../actions";

export async function generateMetadata({ params }: PageProps<"/pacientes/[id]/editar">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient ? `Editar · ${fullName(patient)}` : "Editar paciente" };
}

export default async function EditarPacientePage({ params }: PageProps<"/pacientes/[id]/editar">) {
  const { id } = await params;
  const patient = await getPatientOrNotFound(id);
  const action = updatePatient.bind(null, patient.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="display text-2xl font-medium text-ink">Editar datos del paciente</h2>
        <p className="mt-1 text-[15px] text-muted">
          Datos personales, cobertura, contacto de emergencia y motivo de consulta.
        </p>
      </div>
      <PatientForm mode="edit" action={action} patient={patient} today={todayISO()} cancelHref={`/pacientes/${patient.id}`} />
    </div>
  );
}
