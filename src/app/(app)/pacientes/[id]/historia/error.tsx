"use client";

import { TabError } from "@/components/clinical-history/route-error";

export default function ClinicalHistoryError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <TabError
      error={error}
      retry={retry}
      title="No pudimos cargar la historia clínica"
      description="Revisá tu conexión e intentá de nuevo. Tus datos guardados no se perdieron."
    />
  );
}
