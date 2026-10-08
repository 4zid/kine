import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FramedCard } from "@/components/dashboard/framed-card";
import { cn } from "@/lib/utils";
import type { SettingsSectionId } from "@/components/settings/limits";

/** Sección de ajustes: tarjeta blanca enmarcada con encabezado (ícono + título) y pie opcional. */
export function SettingsSection({
  id,
  icon,
  title,
  description,
  footer,
  children,
  className,
}: {
  id: SettingsSectionId;
  icon: ReactNode;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <FramedCard
      as="section"
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-36 lg:scroll-mt-24 xl:scroll-mt-8", className)}
      footer={footer}
    >
      <header className="mb-7 flex items-start gap-4">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink [&_svg]:size-5">
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 id={`${id}-title`} className="display text-[24px] font-medium text-ink sm:text-[26px]">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
      </header>
      {children}
    </FramedCard>
  );
}

/** Pie de formulario: estado de cambios a la izquierda, "Descartar" + "Guardar" a la derecha. */
export function SaveFooter({
  dirty,
  pending,
  hint,
  onDiscard,
  label = "Guardar",
}: {
  dirty: boolean;
  pending: boolean;
  hint: string;
  onDiscard: () => void;
  label?: string;
}) {
  return (
    <>
      <p className="min-w-0 flex-1 text-[13px] text-muted sm:text-sm" aria-live="polite">
        {dirty ? (
          <span className="inline-flex items-center gap-2 text-ink-2">
            <span aria-hidden className="size-2 rounded-full bg-orange" />
            Tenés cambios sin guardar
          </span>
        ) : (
          hint
        )}
      </p>
      <div className="flex items-center gap-1">
        {dirty && !pending ? (
          <Button variant="ghost" onClick={onDiscard} className="h-11 px-4 text-muted hover:text-ink">
            Descartar
          </Button>
        ) : null}
        <SubmitButton
          pending={pending}
          pendingLabel="Guardando…"
          variant={dirty ? "primary" : "inverse"}
          iconRight={<ArrowRight />}
          className={cn("h-12 px-6", !dirty && "shadow-soft")}
        >
          {label}
        </SubmitButton>
      </div>
    </>
  );
}
