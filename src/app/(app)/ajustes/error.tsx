"use client";

import { RouteError } from "@/components/dashboard/route-error";

export default function AjustesError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="No pudimos cargar tus ajustes" />;
}
