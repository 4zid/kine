"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { DecorCircles } from "@/components/ui/decor";
import { LogoMark } from "@/components/ui/logo";

/**
 * Bienvenida cálida tras el registro (?bienvenida=1). Limpia el parámetro de la URL
 * sin recargar, así no reaparece al refrescar.
 */
export function WelcomeBanner({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("bienvenida")) return;
    url.searchParams.delete("bienvenida");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  if (!open) return null;

  return (
    <section
      aria-labelledby="welcome-title"
      className="relative isolate animate-fade-up overflow-hidden rounded-card bg-gradient-to-r from-brand-50 via-surface to-surface p-6 text-ink sm:p-8"
    >
      <DecorCircles variant="c" className="-z-10 text-brand/25" />
      <div className="flex items-start gap-4 sm:items-center sm:gap-5">
        <span className="relative hidden shrink-0 sm:inline-flex">
          <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full bg-brand/25" />
          <LogoMark className="relative size-14" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="welcome-title" className="display text-[26px] leading-tight font-normal sm:text-[32px]">
            ¡Bienvenida/o a kine{firstName ? "," : ""}{" "}
            <span className="font-semibold">{firstName ? `${firstName}!` : "!"}</span>
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            Tu cuenta ya está lista. Empezá por tu primer paciente: historia clínica, mapa del dolor y sesiones, todo en un mismo
            lugar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar bienvenida"
          className="-mt-1 -mr-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink transition-colors hover:bg-surface-3 sm:mt-0"
        >
          <X className="size-5" />
        </button>
      </div>
    </section>
  );
}
