"use client";

import { RouteError } from "@/components/sessions/route-error";

export default function SessionsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="No pudimos cargar las sesiones" />;
}
