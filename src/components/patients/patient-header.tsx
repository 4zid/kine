import { ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PatientActionsMenu } from "@/components/patients/patient-actions-menu";
import { PatientHeaderActions, SummaryOnlyOnMobile } from "@/components/patients/patient-route";
import { ageLabel, documentLabel, sexLabel, statusMeta, telHref } from "@/components/patients/format";
import type { Patient, PatientStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export type PatientHeaderData = Pick<
  Patient,
  | "id"
  | "first_name"
  | "last_name"
  | "status"
  | "birth_date"
  | "sex"
  | "document_type"
  | "document_number"
  | "health_insurance"
  | "health_insurance_plan"
  | "phone"
  | "created_at"
  | "discharged_at"
  | "archived_at"
>;

/**
 * Encabezado del paciente compartido por todas las pestañas (oculto al imprimir).
 * En mobile es compacto (avatar y nombre más chicos, datos rápidos solo en el Resumen) para que
 * las pestañas y el contenido entren en la primera pantalla.
 */
export function PatientHeader({ patient }: { patient: PatientHeaderData }) {
  const status = statusMeta(patient.status);
  const insurance = [patient.health_insurance, patient.health_insurance_plan].filter(Boolean).join(" ");
  const meta = [
    ageLabel(patient.birth_date),
    sexLabel(patient.sex),
    documentLabel(patient.document_type, patient.document_number),
    insurance || null,
  ].filter((v): v is string => Boolean(v));

  const menuTarget = {
    id: patient.id,
    first_name: patient.first_name,
    last_name: patient.last_name,
    status: patient.status as PatientStatus,
  };

  const since =
    patient.status === "discharged" && patient.discharged_at
      ? `Alta el ${formatDate(patient.discharged_at)}`
      : patient.status === "archived" && patient.archived_at
        ? `Archivado el ${formatDate(patient.archived_at)}`
        : `Paciente desde ${formatDate(patient.created_at)}`;

  return (
    <header className="animate-fade-in print:hidden">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/pacientes"
          className="group -ml-1 inline-flex h-10 items-center gap-2.5 rounded-full pr-3 text-sm text-ink-2 transition-colors hover:text-ink"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-surface shadow-inset transition-transform group-hover:-translate-x-0.5">
            <ArrowLeft className="size-4" aria-hidden />
          </span>
          Pacientes
        </Link>
        {/* En mobile el menú sube a esta fila para dejar lugar a las dos acciones principales. */}
        <PatientActionsMenu context="detail" variant="round" patient={menuTarget} className="sm:hidden" />
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:mt-5 sm:gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 items-center gap-3.5 sm:gap-5">
          <Avatar person={patient} size="xl" className="size-12 text-base sm:size-20 sm:text-2xl" />
          <div className="min-w-0">
            <p className="mb-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-ink-2 sm:mb-2 sm:text-sm">
              <Badge dot={status.color} tone="white" className="h-6 sm:h-7">
                {status.label}
              </Badge>
              <span>{since}</span>
            </p>
            <h1 className="display text-[26px] leading-[1.08] font-normal break-words text-ink sm:text-5xl xl:text-[54px]">
              {patient.first_name} {patient.last_name}
            </h1>
          </div>
        </div>

        <PatientHeaderActions patientId={patient.id}>
          <PatientActionsMenu context="detail" variant="round" patient={menuTarget} className="hidden sm:block" />
        </PatientHeaderActions>
      </div>

      {meta.length > 0 || patient.phone ? (
        <SummaryOnlyOnMobile patientId={patient.id}>
          <ul className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5" aria-label="Datos del paciente">
            {meta.map((m) => (
              <li key={m}>
                <Badge tone="white" className="h-8 px-3 text-[13px]">
                  {m}
                </Badge>
              </li>
            ))}
            {patient.phone ? (
              <li>
                <a
                  href={telHref(patient.phone)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium text-ink-2 shadow-inset transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <Phone className="size-3.5" aria-hidden />
                  {patient.phone}
                </a>
              </li>
            ) : null}
          </ul>
        </SummaryOnlyOnMobile>
      ) : null}
    </header>
  );
}
