"use client";

import { House, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Error de una pantalla privada sin error.tsx propio: se muestra dentro del AppShell. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-card bg-surface">
      <EmptyState
        role="alert"
        headingAs="h1"
        className="py-20"
        icon={<RotateCcw strokeWidth={1.6} />}
        title="No pudimos cargar esta pantalla"
        description="Puede ser un problema momentáneo de conexión. Probá de nuevo en unos segundos."
        action={
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={() => retry()} icon={<RotateCcw aria-hidden />}>
              Reintentar
            </Button>
            <ButtonLink href="/inicio" variant="secondary" icon={<House aria-hidden />}>
              Ir al inicio
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
