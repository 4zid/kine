import type { Metadata } from "next";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { DecorCircles } from "@/components/ui/decor";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Página no encontrada" };

/** 404 de toda la app (URLs que no existen). */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col px-4 py-6 sm:px-6">
      <Link href="/inicio" aria-label="kine — inicio" className="inline-flex self-start">
        <Logo />
      </Link>
      <div className="flex flex-1 items-center justify-center py-10">
        <section className="relative isolate w-full max-w-2xl overflow-hidden rounded-card bg-surface px-6 py-14 text-center sm:px-10 sm:py-16">
          <DecorCircles variant="c" className="-z-10 text-line-strong" />
          <p className="text-sm font-medium tracking-[0.14em] text-muted uppercase">Error 404</p>
          <h1 className="display mt-3 text-[34px] text-ink sm:text-[44px]">
            <span className="font-light text-muted">No encontramos</span>
            <br />
            <span className="font-medium">esta página</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">
            Puede que el enlace esté mal escrito o que la página ya no exista. Volvé al inicio o buscá al paciente en el
            listado.
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
      </div>
    </main>
  );
}
