import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Encabezado de página (como "Hola, Martina · Semana 41" + "5 – 11 oct").
 * `eyebrow` admite nodos para resaltar partes en negrita.
 */
export function PageHeader({
  eyebrow,
  title,
  titleMuted,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Parte del título en gris (como el "2026" de "5 – 11 oct 2026"). */
  titleMuted?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-2 text-[15px] text-muted [&_strong]:font-medium [&_strong]:text-ink">{eyebrow}</p> : null}
        <h1 className="display text-[40px] font-normal text-ink sm:text-5xl lg:text-[56px]">
          {title}
          {titleMuted ? <span className="text-muted"> {titleMuted}</span> : null}
        </h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
