import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tarjeta blanca muy redondeada (r=28px). */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-card bg-surface p-6 sm:p-7", className)} {...props} />;
}

/** Panel interno gris (como los bloques Placer / Control). */
export function Panel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-panel bg-surface-2 p-5", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="display text-[22px] font-medium text-ink sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Etiqueta de sección en mayúsculas espaciadas (como "MENÚ", "SEMANAS"). */
export function SectionLabel({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("px-3 text-[11px] font-medium tracking-[0.14em] text-subtle uppercase", className)}
      {...props}
    />
  );
}
