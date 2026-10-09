"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Fallback de error para rutas de la zona privada (inicio / ajustes / pacientes).
 * Reemplaza todo el contenido de la página, así que lleva su propio título de
 * página (h1) y se anuncia como alerta.
 */
export function RouteError({
  error,
  retry,
  title = "No pudimos cargar esta pantalla",
  as: Heading = "h1",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  /** Nivel del título (h1 por defecto: el error reemplaza a la página). */
  as?: "h1" | "h2";
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="rounded-card bg-surface">
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div
          aria-hidden
          className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-surface-2 text-ink-2 [&_svg]:size-6"
        >
          <RotateCcw strokeWidth={1.6} />
        </div>
        <Heading className="display text-xl font-medium text-ink">{title}</Heading>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Puede ser un problema momentáneo de conexión. Probá de nuevo en unos segundos.
        </p>
        <div className="mt-6">
          <Button onClick={() => retry()} icon={<RotateCcw />}>
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}
