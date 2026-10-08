"use client";

import { RouteError } from "@/components/dashboard/route-error";

export default function PacientesError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="No pudimos cargar los pacientes" />;
}
