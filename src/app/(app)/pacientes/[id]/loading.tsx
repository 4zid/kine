"use client";

import { usePathname } from "next/navigation";
import { PatientFormSkeleton, PatientTabSkeleton } from "@/components/patients/skeletons";

/**
 * Carga del contenido de una pestaña (el encabezado y las pestañas del paciente ya están visibles).
 * Las pestañas que no definan su propio loading.tsx usan la grilla genérica.
 */
export default function PatientTabLoading() {
  const pathname = usePathname();
  if (pathname.endsWith("/editar")) return <PatientFormSkeleton compact />;
  return <PatientTabSkeleton />;
}
