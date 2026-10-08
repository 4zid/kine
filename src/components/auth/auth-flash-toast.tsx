"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const FLASHES: Record<string, { param: string; value: string; title: string; description?: string }> = {
  bienvenida: {
    param: "bienvenida",
    value: "1",
    title: "¡Tu cuenta está lista!",
    description: "Empezá agregando a tu primer paciente.",
  },
  clave: { param: "clave", value: "actualizada", title: "Actualizaste tu contraseña." },
};

/**
 * Muestra un toast según parámetros que dejan los flujos de acceso
 * (`?bienvenida=1` después de registrarse, `?clave=actualizada` después de cambiar la
 * contraseña) y limpia la URL. Montar dentro de un <Suspense> en la zona privada.
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
