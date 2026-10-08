"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function BodyMapError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-card bg-surface">
      <EmptyState
        icon={<RotateCcw />}
        title="No pudimos cargar el mapa corporal"
        description="Puede ser un problema de conexión. Tus datos están a salvo: probá de nuevo en unos segundos."
        action={
          <Button onClick={() => retry()} icon={<RotateCcw />}>
            Reintentar
          </Button>
        }
      />
    </div>
  );
}
