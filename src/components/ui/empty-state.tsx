import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Estado vacío / de error centrado.
 * `headingAs` define el nivel del título según dónde se use (h1 si es lo único de la página,
 * p. ej. en un error.tsx; h2 bajo el h1 de la página; h3 dentro de una tarjeta).
 * `role="alert"` para anunciar un estado de error que reemplaza la pantalla.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  headingAs: Heading = "h3",
  role,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  headingAs?: "h1" | "h2" | "h3" | "h4";
  role?: "alert" | "status";
}) {
  return (
    <div role={role} className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon ? (
        <div aria-hidden className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-surface-2 text-ink-2 [&_svg]:size-6">
          {icon}
        </div>
      ) : null}
      <Heading className="display text-xl font-medium text-ink">{title}</Heading>
      {description ? <p className="mt-2 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
