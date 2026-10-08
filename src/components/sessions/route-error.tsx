"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Contenido de error.tsx para las rutas de sesiones e informe. */
export function RouteError({
  error,
  retry,
  title,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-card bg-surface print:hidden">
      <EmptyState
        icon={<TriangleAlert />}
        title={title}
        description="Revisá tu conexión y probá de nuevo. Si el problema sigue, recargá la página."
        action={
          <Button onClick={() => retry()} icon={<RotateCw />}>
            Reintentar
          </Button>
        }
      />
    </div>
  );
}
