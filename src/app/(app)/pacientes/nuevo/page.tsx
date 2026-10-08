import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { PatientForm } from "@/components/patients/patient-form";
import { todayISO } from "@/lib/utils";
import { createPatient } from "../actions";

export const metadata: Metadata = { title: "Nuevo paciente" };

export default async function NuevoPacientePage() {
  await connection();
  const today = todayISO();

  return (
    <div className="flex flex-col gap-8">
      <header className="animate-fade-in">
        <Link
          href="/pacientes"
          className="group -ml-1 inline-flex h-10 items-center gap-2.5 rounded-full pr-3 text-sm text-muted transition-colors hover:text-ink"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-surface shadow-inset transition-transform group-hover:-translate-x-0.5">
            <ArrowLeft className="size-4" aria-hidden />
          </span>
          Pacientes
        </Link>
        <p className="mt-6 text-[15px] text-muted">
          Pacientes · <span className="font-medium text-ink">Nuevo</span>
        </p>
        <h1 className="display mt-2 text-[40px] text-ink sm:text-5xl lg:text-[56px]">
          <span className="font-light text-muted">Registrá un</span>
          <br />
          <span className="font-medium">nuevo paciente</span>
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          Empezá por sus datos y el motivo de consulta. La historia clínica, el mapa corporal y las sesiones los
          completás después, desde su ficha.
        </p>
      </header>

      <PatientForm mode="create" action={createPatient} today={today} cancelHref="/pacientes" />
    </div>
  );
}
