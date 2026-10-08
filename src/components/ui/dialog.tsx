"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
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
};

const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-2xl", xl: "max-w-4xl" };

/** Diálogo accesible basado en <dialog> nativo (foco, Esc y backdrop incluidos). */
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
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
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
      {open ? (
        <div
          role="document"
          className={cn(
            "relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface shadow-float",
            variant === "modal"
              ? cn("animate-scale-in rounded-t-card sm:rounded-card", widths[size])
              : cn("animate-slide-in-right rounded-t-card sm:max-h-none sm:rounded-card", widths[size]),
            className,
          )}
        >
          {(title || description) && (
            <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-7 sm:pt-7">
              <div className="min-w-0">
                {title ? <h2 className="display text-2xl font-medium">{title}</h2> : null}
                {description ? <p className="mt-1.5 text-sm text-muted">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-mt-1 -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>
          )}
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
        </div>
      ) : null}
    </dialog>
  );
}
