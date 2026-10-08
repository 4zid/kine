"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Fallback de error para las rutas del módulo (inicio / ajustes). */
export function RouteError({
  error,
  retry,
  title = "No pudimos cargar esta pantalla",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-card bg-surface">
      <EmptyState
        className="py-20"
        icon={<RotateCcw strokeWidth={1.6} />}
        title={title}
        description="Puede ser un problema momentáneo de conexión. Probá de nuevo en unos segundos."
        action={
          <Button onClick={() => retry()} icon={<RotateCcw />}>
            Reintentar
          </Button>
        }
      />
    </div>
  );
}
