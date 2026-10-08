import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const fieldBase =
  "w-full rounded-field bg-surface-2 px-4 text-[15px] text-ink placeholder:text-subtle outline-none ring-0 transition-[background-color,box-shadow] duration-150 hover:bg-surface-3/70 focus:bg-surface focus:shadow-[0_0_0_1.5px_var(--color-ink)] disabled:opacity-60 aria-[invalid=true]:shadow-[0_0_0_1.5px_var(--color-danger)]";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-[13px] font-medium text-ink-2", className)} {...props} />;
}

/** Envoltura de campo: etiqueta + control + ayuda/error. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2">
          <span>{label}</span>
          {optional ? <span className="text-xs font-normal text-subtle">Opcional</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-12", className)} {...props} />;
}

export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(fieldBase, "min-h-24 resize-y py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          fieldBase,
          "h-12 cursor-pointer appearance-none pr-10 invalid:text-subtle [&>option]:text-ink",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 7.5 5 5 5-5" />
      </svg>
    </div>
  );
}

/** Texto grande sin caja (como "¿Qué hiciste? Desayuné con mi hermana"). */
export function BigInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "display w-full bg-transparent text-3xl font-normal text-ink placeholder:text-subtle/80 outline-none sm:text-[34px]",
        className,
      )}
      {...props}
    />
  );
}
