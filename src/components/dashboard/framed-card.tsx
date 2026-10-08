import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tarjeta blanca dentro de un marco gris con pie (como la tarjeta de carga de daily:
 * contenido arriba y, abajo, una pista a la izquierda + botón píldora blanco a la derecha).
 */
export function FramedCard({
  children,
  footer,
  className,
  bodyClassName,
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "div" | "section";
  id?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <Tag className={cn("rounded-[34px] bg-surface-3/80 p-1.5 shadow-inset", className)} {...rest}>
      <div className={cn("rounded-card bg-surface p-5 shadow-soft sm:p-8", bodyClassName)}>{children}</div>
      {footer ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3 pr-1.5 pl-5 sm:pl-7">{footer}</div>
      ) : null}
    </Tag>
  );
}
