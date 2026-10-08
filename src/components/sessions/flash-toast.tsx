"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Muestra un toast al llegar con `?<param>=…` (p. ej. después de guardar una sesión)
 * y quita el parámetro de la URL sin volver a pedir la página.
 */
export function FlashToast({ param, message, description }: { param: string; message: string; description?: string }) {
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    // Diferido: asegura que el <Toaster> del layout ya esté montado.
    window.setTimeout(() => toast.success(message, description ? { description } : undefined), 0);
    const url = new URL(window.location.href);
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [param, message, description]);

  return null;
}
