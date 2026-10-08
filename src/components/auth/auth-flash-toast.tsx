"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const FLASHES: Record<string, { param: string; value: string; title: string; description?: string }> = {
  clave: { param: "clave", value: "actualizada", title: "Actualizaste tu contraseña." },
};

/**
 * Muestra un toast según parámetros que dejan los flujos de acceso
 * (`?clave=actualizada` después de cambiar la contraseña) y limpia la URL.
 * La bienvenida (`?bienvenida=1`) la muestra el banner del inicio. Montar dentro de un <Suspense> en la zona privada.
 */
export function AuthFlashToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const matches = Object.values(FLASHES).filter((f) => params.get(f.param) === f.value);
    if (matches.length === 0) return;
    matches.forEach((f) => toast.success(f.title, { description: f.description, id: `flash-${f.param}` }));
    const next = new URLSearchParams(params.toString());
    matches.forEach((f) => next.delete(f.param));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  return null;
}
