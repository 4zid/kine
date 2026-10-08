"use client";

import { PersonStanding, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** En qué pestaña / pantalla del paciente estamos (para adaptar el cromo compartido del layout). */
export function usePatientRoute(patientId: string) {
  const pathname = usePathname();
  const base = `/pacientes/${patientId}`;
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  return {
    isSummary: rest === "" || rest === "/",
    isMap: rest === "/mapa",
    isEdit: rest === "/editar",
    /** Formulario de sesión (nueva o edición): el CTA "Nueva sesión" ahí solo confunde. */
    isSessionForm: rest === "/sesiones/nueva" || /^\/sesiones\/[^/]+\/editar$/.test(rest),
  };
}

/**
 * Acciones principales del encabezado ("Registrar dolor" / "Nueva sesión"). Se ocultan en la
 * pantalla a la que llevan (el mapa, el formulario de sesión) para no ofrecer un no-op ni un
 * atajo que descarte lo que se está cargando. `children` = menú "…" (desktop).
 */
export function PatientHeaderActions({ patientId, children }: { patientId: string; children?: ReactNode }) {
  const route = usePatientRoute(patientId);
  const base = `/pacientes/${patientId}`;
  const showPain = !route.isMap;
  const showSession = !route.isSessionForm;
  const count = Number(showPain) + Number(showSession);

  return (
    <div className={cn("grid gap-2 sm:flex sm:items-center", count === 2 ? "grid-cols-2" : "grid-cols-1")}>
      {showPain ? (
        <ButtonLink href={`${base}/mapa`} variant="secondary" icon={<PersonStanding />} className="min-w-0 px-3 sm:px-5">
          Registrar dolor
        </ButtonLink>
      ) : null}
      {showSession ? (
        <ButtonLink href={`${base}/sesiones/nueva`} icon={<Plus />} className="min-w-0 px-3 sm:px-5">
          Nueva sesión
        </ButtonLink>
      ) : null}
      {children}
    </div>
  );
}

/**
 * Datos rápidos del encabezado (edad, documento, obra social, teléfono): en mobile solo en el
 * Resumen, para que en las demás pestañas el contenido empiece dentro de la primera pantalla.
 */
export function SummaryOnlyOnMobile({ patientId, children }: { patientId: string; children: ReactNode }) {
  const { isSummary } = usePatientRoute(patientId);
  return <div className={cn(!isSummary && "hidden sm:block")}>{children}</div>;
}
