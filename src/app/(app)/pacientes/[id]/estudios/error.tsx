"use client";

import { TabError } from "@/components/clinical-history/route-error";

export default function StudiesError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <TabError
      error={error}
      retry={retry}
      title="No pudimos cargar los estudios"
      description="Revisá tu conexión e intentá de nuevo. Los archivos siguen guardados de forma segura."
    />
  );
}
