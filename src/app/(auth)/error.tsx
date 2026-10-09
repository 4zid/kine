"use client";

import { RotateCw } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function AuthError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div role="alert" className="w-full max-w-md rounded-card bg-surface p-8 text-center shadow-soft">
        <Logo className="justify-center" />
        <h1 className="display mt-8 text-[30px] text-ink">
          <span className="block font-normal">Algo no salió</span>
          <span className="block font-semibold">como esperábamos.</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Puede ser un problema de conexión. Probá de nuevo en unos segundos.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => retry()} icon={<RotateCw />} size="lg">
            Reintentar
          </Button>
          <ButtonLink href="/ingresar" variant="secondary" size="lg">
            Ir a ingresar
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
