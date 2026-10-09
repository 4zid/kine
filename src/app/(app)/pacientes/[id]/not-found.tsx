import { ArrowLeft, Plus, UserRoundX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DecorCircles } from "@/components/ui/decor";

export default function PatientNotFound() {
  return (
    <Card className="relative isolate mx-auto mt-4 max-w-2xl overflow-hidden px-6 py-14 text-center sm:px-10 sm:py-16">
      <DecorCircles variant="c" className="-z-10 text-line-strong" />
      <span className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-surface-2 text-ink-2">
        <UserRoundX className="size-7" strokeWidth={1.6} aria-hidden />
      </span>
      <p className="mt-6 text-sm font-medium tracking-[0.14em] text-muted uppercase">Error 404</p>
      <h1 className="display mt-3 text-[34px] text-ink sm:text-[44px]">
        <span className="font-light text-muted">No encontramos</span>
        <br />
        <span className="font-medium">a este paciente</span>
      </h1>
      <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">
        Puede que se haya eliminado o que el enlace no sea correcto. Solo ves los pacientes que cargaste en tu cuenta.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
        <ButtonLink href="/pacientes" icon={<ArrowLeft />}>
          Volver a pacientes
        </ButtonLink>
        <ButtonLink href="/pacientes/nuevo" variant="secondary" icon={<Plus />}>
          Nuevo paciente
        </ButtonLink>
      </div>
    </Card>
  );
}
