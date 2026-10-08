"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Error del contenido de una pestaña del paciente (Resumen, Editar y las pestañas sin error.tsx
 * propio). Queda dentro del layout: el encabezado y las alertas clínicas siguen visibles.
 * Mejor esto que un resumen clínico incompleto mostrado como si estuviera vacío.
 */
export default function PatientTabError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex animate-fade-up flex-col items-center rounded-card bg-surface px-6 py-14 text-center">
      <span className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-danger-50 text-danger">
        <TriangleAlert className="size-6" strokeWidth={1.8} aria-hidden />
      </span>
      <h2 className="display text-2xl font-medium text-ink">No pudimos cargar esta sección</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Puede ser un problema momentáneo de conexión. Tus datos guardados no se perdieron.
      </p>
      <Button variant="primary" className="mt-6" icon={<RotateCcw />} onClick={() => retry()}>
        Reintentar
      </Button>
    </div>
  );
}
