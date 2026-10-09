import { Children, cloneElement, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 16px en mobile (evita el zoom automático de iOS al enfocar) y 15px desde `sm`. */
export const fieldBase =
  "w-full rounded-field bg-surface-2 px-4 text-base sm:text-[15px] text-ink placeholder:text-subtle outline-none ring-0 transition-[background-color,box-shadow] duration-150 hover:bg-surface-3/70 focus:bg-surface focus:shadow-[0_0_0_1.5px_var(--color-ink)] disabled:opacity-60 aria-[invalid=true]:shadow-[0_0_0_1.5px_var(--color-danger)]";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-[13px] font-medium text-ink-2", className)} {...props} />;
}

/** Ids de la ayuda y del error de un Field (por si un control propio necesita referenciarlos). */
export function fieldDescriptionIds(htmlFor: string) {
  return { hintId: `${htmlFor}-field-hint`, errorId: `${htmlFor}-field-error` };
}

type ControlProps = { id?: string; "aria-describedby"?: string; "aria-invalid"?: unknown; children?: ReactNode };

/**
 * Busca el control con `id === htmlFor` (directo o dentro de envoltorios HTML simples, hasta 3
 * niveles) y le agrega `aria-describedby` (ayuda/error) y `aria-invalid`, sin pisar lo que ya tenga.
 */
function wireControl(node: ReactNode, htmlFor: string, describedBy: string | undefined, invalid: boolean, depth = 0): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement<ControlProps>(child)) return child;
    const props = child.props;
    if (props.id === htmlFor) {
      const ids = [props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined;
      return cloneElement(child as ReactElement<ControlProps>, {
        "aria-describedby": ids,
        ...(invalid && props["aria-invalid"] == null ? { "aria-invalid": true } : null),
      });
    }
    if (depth < 3 && typeof child.type === "string" && props.children != null) {
      return cloneElement(child as ReactElement<ControlProps>, undefined, wireControl(props.children, htmlFor, describedBy, invalid, depth + 1));
    }
    return child;
  });
}

/**
 * Envoltura de campo: etiqueta + control + ayuda/error.
 * Con `htmlFor`, la ayuda y el error quedan asociados al control (aria-describedby) y el control
 * se marca aria-invalid cuando hay error, así el lector de pantalla los vuelve a leer al enfocar.
 */
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
  const ids = htmlFor ? fieldDescriptionIds(htmlFor) : null;
  const describedBy = ids ? (error ? ids.errorId : hint ? ids.hintId : undefined) : undefined;
  const content = htmlFor ? wireControl(children, htmlFor, describedBy, Boolean(error)) : children;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2">
          <span>{label}</span>
          {optional ? <span className="text-xs font-normal text-muted">Opcional</span> : null}
        </Label>
      ) : null}
      {content}
      {error ? (
        <p id={ids?.errorId} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={ids?.hintId} className="text-[13px] text-muted">
          {hint}
        </p>
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
