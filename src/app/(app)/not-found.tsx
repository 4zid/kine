import { ArrowLeft, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { DecorCircles } from "@/components/ui/decor";

/** 404 dentro de la zona privada (cuando una pantalla llama a notFound()): conserva el AppShell. */
export default function AppNotFound() {
  return (
    <section className="relative isolate mx-auto mt-4 max-w-2xl overflow-hidden rounded-card bg-surface px-6 py-14 text-center sm:px-10 sm:py-16">
      <DecorCircles variant="c" className="-z-10 text-line-strong" />
      <p className="text-sm font-medium tracking-[0.14em] text-muted uppercase">Error 404</p>
      <h1 className="display mt-3 text-[34px] text-ink sm:text-[44px]">
        <span className="font-light text-muted">No encontramos</span>
        <br />
        <span className="font-medium">esta página</span>
      </h1>
      <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">
        Puede que el enlace esté mal escrito o que la página ya no exista.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
        <ButtonLink href="/inicio" icon={<ArrowLeft aria-hidden />}>
          Ir al inicio
        </ButtonLink>
        <ButtonLink href="/pacientes" variant="secondary" icon={<Users aria-hidden />}>
          Ver pacientes
        </ButtonLink>
      </div>
    </section>
  );
}
