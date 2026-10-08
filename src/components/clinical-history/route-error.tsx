"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Estado de error de una pestaña del paciente (para error.tsx). */
export function TabError({
  error,
  retry,
  title,
  description,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title: string;
  description: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex animate-fade-up flex-col items-center rounded-card bg-surface px-6 py-14 text-center"
    >
      <span className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-danger-50 text-danger">
        <TriangleAlert className="size-6" strokeWidth={1.8} />
      </span>
      <h2 className="display text-2xl font-medium text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
      <Button variant="primary" className="mt-6" icon={<RotateCcw />} onClick={() => retry()}>
        Reintentar
      </Button>
    </div>
  );
}
