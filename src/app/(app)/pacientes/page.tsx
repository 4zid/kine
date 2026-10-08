import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PatientsBrowser } from "@/components/patients/patients-browser";
import { PatientsLoadError, PatientsNoResults, PatientsWelcome } from "@/components/patients/patients-empty";
import { PatientsList } from "@/components/patients/patients-list";
import { PatientsPagination } from "@/components/patients/patients-pagination";
import { listPatients } from "@/lib/data/patients-list";
import { parsePatientListParams, patientListHref } from "@/lib/data/patients-types";

export const metadata: Metadata = { title: "Pacientes" };

export default async function PacientesPage({ searchParams }: PageProps<"/pacientes">) {
  const params = parsePatientListParams(await searchParams);
  const result = await listPatients(params);
  const current = { ...params, page: result.page };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={
          <>
            <strong>{result.activeTotal}</strong> en tratamiento
            {result.counts.all > result.activeTotal && !params.q ? <> · {result.counts.all} en total</> : null}
          </>
        }
        title="Pacientes"
        actions={
          <ButtonLink href="/pacientes/nuevo" icon={<Plus />} size="lg" className="hidden sm:inline-flex">
            Nuevo paciente
          </ButtonLink>
        }
      />

      {result.isEmptyAccount ? (
        <PatientsWelcome />
      ) : (
        <PatientsBrowser params={current} counts={result.counts}>
          {result.error ? (
            <PatientsLoadError href={patientListHref(current)} />
          ) : result.items.length === 0 ? (
            <PatientsNoResults params={current} counts={result.counts} />
          ) : (
            <>
              <PatientsList items={result.items} />
              <PatientsPagination params={current} page={result.page} pageCount={result.pageCount} total={result.total} />
            </>
          )}
        </PatientsBrowser>
      )}
    </div>
  );
}
