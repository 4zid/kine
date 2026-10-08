"use client";

import { X } from "lucide-react";
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** "sheet" = panel lateral derecho (en mobile sube desde abajo). */
  variant?: "modal" | "sheet";
  className?: string;
  /** Nombre accesible cuando el diálogo no tiene `title` visible (p. ej. "Menú"). */
  "aria-label"?: string;
  /** Muestra el botón "Cerrar" (X). Por defecto siempre visible, aunque no haya título. */
  showClose?: boolean;
};

const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-2xl", xl: "max-w-4xl" };

/**
 * Abre/cierra el <dialog> en la fase de layout, ANTES de que se monte el contenido (es el primer
 * hijo): así el `autoFocus` de React del contenido encuentra el diálogo ya visible y funciona.
 * Al cerrar devuelve el foco al elemento que lo abrió.
 */
function DialogSync({ open }: { open: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const dialog = ref.current?.parentElement;
    if (!(dialog instanceof HTMLDialogElement)) return;
    if (open && !dialog.open) {
      const active = document.activeElement;
      opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
      const target = opener.current;
      opener.current = null;
      if (target?.isConnected && (document.activeElement === document.body || dialog.contains(document.activeElement))) {
        target.focus({ preventScroll: true });
      }
    }
  }, [open]);

  return <span ref={ref} hidden />;
}

/** Enfoca el elemento marcado con `data-autofocus` (alternativa explícita a autoFocus). */
function AutoFocus() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current?.closest("dialog");
    if (!dialog?.open) return;
    const target = dialog.querySelector<HTMLElement>("[data-autofocus]");
    if (target && !target.contains(document.activeElement)) target.focus();
  }, []);
  return <span ref={ref} hidden />;
}

/**
 * Diálogo accesible basado en <dialog> nativo (foco atrapado, Esc y backdrop incluidos).
 * - Nombre y descripción accesibles a partir de `title`/`description` (o `aria-label`).
 * - Foco inicial: `autoFocus` o `data-autofocus` en un control del contenido; si no, el primero.
 * - Al cerrar, el foco vuelve al botón que lo abrió.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  variant = "modal",
  className,
  "aria-label": ariaLabel,
  showClose = true,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const hasHeader = Boolean(title || description);

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Cerrar"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink",
        hasHeader ? "-mt-1 -mr-2" : "absolute top-3 right-3 z-10 bg-surface/90 sm:top-4 sm:right-4",
      )}
    >
      <X className="size-5" aria-hidden />
    </button>
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : ariaLabel}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 text-ink backdrop:bg-transparent open:flex",
        variant === "modal"
          ? "fixed inset-0 h-dvh w-screen items-end justify-center sm:items-center sm:p-6"
          : "fixed inset-0 h-dvh w-screen items-end justify-end sm:items-stretch sm:p-3",
      )}
    >
      <DialogSync open={open} />
      {open ? (
        <div
          className={cn(
            "relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface shadow-float",
            variant === "modal"
              ? cn("animate-scale-in rounded-t-card sm:rounded-card", widths[size])
              : cn("animate-slide-in-right rounded-t-card sm:max-h-none sm:rounded-card", widths[size]),
            className,
          )}
        >
          {hasHeader ? (
            <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-7 sm:pt-7">
              <div className="min-w-0">
                {title ? (
                  <h2 id={titleId} className="display text-2xl font-medium">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p id={descId} className="mt-1.5 text-sm text-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              {showClose ? closeButton : null}
            </div>
          ) : showClose ? (
            closeButton
          ) : null}
          {children != null && children !== false ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-7">{children}</div>
          ) : (
            <div className="h-5" />
          )}
          {footer ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-6 py-4 sm:px-7">
              {footer}
            </div>
          ) : null}
          <AutoFocus />
        </div>
      ) : null}
    </dialog>
  );
}
