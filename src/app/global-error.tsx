"use client";

import { LogOut, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/lib/actions/session";
import "./globals.css";

/**
 * Último recurso: errores del layout raíz o del layout de la zona privada (p. ej. no se pudo
 * cargar el perfil del profesional). Reemplaza al layout raíz, por eso arma su propio <html>.
 * Ofrece reintentar y, si el problema es la cuenta, cerrar sesión (evita quedar atrapado).
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    // Sin el layout raíz no están las fuentes de next/font: se definen sus variables con fuentes del sistema.
    <html lang="es-AR" style={{ ["--font-inter" as string]: "system-ui", ["--font-inter-tight" as string]: "system-ui" }}>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">
        <title>Algo salió mal · kine</title>
        <main className="flex min-h-dvh flex-col px-4 py-6 sm:px-6">
          <Logo className="self-start" />
          <div className="flex flex-1 items-center justify-center py-10">
            <section
              role="alert"
              className="w-full max-w-xl rounded-card bg-surface px-6 py-14 text-center sm:px-10"
            >
              <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-surface-2 text-ink-2">
                <RotateCcw className="size-6" strokeWidth={1.6} aria-hidden />
              </span>
              <h1 className="display mt-6 text-[32px] font-medium text-ink sm:text-[40px]">Algo salió mal</h1>
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted">
                No pudimos cargar kine. Puede ser un problema momentáneo de conexión: probá de nuevo en unos segundos.
                Si sigue pasando, cerrá la sesión y volvé a ingresar.
              </p>
              {error.digest ? <p className="mt-3 text-xs text-muted">Código: {error.digest}</p> : null}
              <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
                <Button onClick={() => retry()} icon={<RotateCcw aria-hidden />}>
                  Reintentar
                </Button>
                <form action={signOut}>
                  <Button type="submit" variant="secondary" icon={<LogOut aria-hidden />} className="w-full sm:w-auto">
                    Cerrar sesión
                  </Button>
                </form>
              </div>
            </section>
          </div>
        </main>
      </body>
    </html>
  );
}
