"use client";

import { usePathname } from "next/navigation";
import { RouteError } from "@/components/dashboard/route-error";

/**
 * Error del listado, del alta y de la ficha del paciente (este límite también envuelve el
 * layout de /pacientes/[id]: encabezado y alertas clínicas).
 */
export default function PacientesError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const pathname = usePathname();
  const title =
    pathname === "/pacientes/nuevo"
      ? "No pudimos cargar el formulario"
      : pathname.startsWith("/pacientes/")
        ? "No pudimos cargar la ficha del paciente"
        : "No pudimos cargar los pacientes";
  return <RouteError error={error} retry={retry} title={title} />;
}
