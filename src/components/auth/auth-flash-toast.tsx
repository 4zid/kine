"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const FLASHES: Record<string, { param: string; value: string; title: string; description?: string }> = {
  clave: {
    param: "clave",
    value: "actualizada",
    title: "Actualizaste tu contraseña.",
    description: "Cerramos tu sesión en los demás dispositivos.",
  },
};

/**
 * Muestra un toast según parámetros que dejan los flujos de acceso
 * (`?clave=actualizada` después de cambiar la contraseña) y limpia la URL.
 * La bienvenida (`?bienvenida=1`) la muestra el banner del inicio. Montar dentro de un <Suspense> en la zona privada.
 */
export function AuthFlashToast() {
  const params = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const matches = Object.values(FLASHES).filter((f) => params.get(f.param) === f.value);
    if (matches.length === 0) return;
    matches.forEach((f) => toast.success(f.title, { description: f.description, id: `flash-${f.param}` }));
    const next = new URLSearchParams(params.toString());
    matches.forEach((f) => next.delete(f.param));
    const qs = next.toString();
    // history.replaceState (sincronizado por Next con useSearchParams) limpia la URL sin
    // volver a pedir la página al servidor.
    window.history.replaceState(null, "", `${qs ? `${pathname}?${qs}` : pathname}${window.location.hash}`);
  }, [params, pathname]);

  return null;
}
