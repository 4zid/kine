"use client";

import { usePathname } from "next/navigation";
import { PatientDetailSkeleton, PatientFormSkeleton, PatientsListSkeleton } from "@/components/patients/skeletons";

/**
 * Este límite de carga también envuelve a /pacientes/nuevo y /pacientes/[id] mientras su
 * layout carga: se elige el esqueleto según la ruta de destino.
 */
export default function PacientesLoading() {
  const pathname = usePathname();
  if (pathname === "/pacientes/nuevo") return <PatientFormSkeleton />;
  if (pathname.startsWith("/pacientes/")) return <PatientDetailSkeleton />;
  return <PatientsListSkeleton />;
}
