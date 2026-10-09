"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Muestra un toast al llegar con `?<param>=…` (p. ej. después de guardar una sesión)
 * y quita el parámetro (y `extraParams`) de la URL sin volver a pedir la página.
 * `action` agrega un botón al toast que navega a `href`.
 */
export function FlashToast({
  param,
  message,
  description,
  extraParams,
  action,
}: {
  param: string;
  message: string;
  description?: string;
  extraParams?: string[];
  action?: { label: string; href: string };
}) {
  const router = useRouter();
  const shown = useRef(false);
  const actionLabel = action?.label;
  const actionHref = action?.href;
  const extra = extraParams?.join(",") ?? "";

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    // Diferido: asegura que el <Toaster> del layout ya esté montado.
    window.setTimeout(
      () =>
        toast.success(message, {
          description,
          duration: actionHref ? 8000 : undefined,
          action:
            actionLabel && actionHref ? { label: actionLabel, onClick: () => router.push(actionHref) } : undefined,
        }),
      0,
    );
    const url = new URL(window.location.href);
    const keys = [param, ...(extra ? extra.split(",") : [])];
    if (keys.some((k) => url.searchParams.has(k))) {
      for (const k of keys) url.searchParams.delete(k);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [param, message, description, extra, actionLabel, actionHref, router]);

  return null;
}
