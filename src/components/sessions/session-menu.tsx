"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Menú "…" de una sesión (Editar / Eliminar). Botón con aria-haspopup, foco en el primer
 * ítem al abrir, flechas para moverse, Esc / clic afuera para cerrar.
 */
export function SessionMenu({
  editHref,
  onDelete,
  label,
  className,
}: {
  editHref: string;
  onDelete: () => void;
  /** Para el aria-label: "sesión del 8 oct". */
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items.at(-1)?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const itemClass =
    "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] font-medium outline-none transition-colors focus-visible:bg-surface-2 [&_svg]:size-4";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Opciones de la ${label}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink",
          open && "bg-surface-2 text-ink",
        )}
      >
        <Ellipsis className="size-5" aria-hidden />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`Opciones de la ${label}`}
          onKeyDown={onMenuKeyDown}
          className="absolute top-11 right-0 z-30 w-48 origin-top-right animate-scale-in rounded-2xl bg-surface p-1.5 shadow-float"
        >
          <Link
            role="menuitem"
            href={editHref}
            onClick={() => close(false)}
            className={cn(itemClass, "text-ink hover:bg-surface-2")}
          >
            <Pencil aria-hidden />
            Editar
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              close(false);
              onDelete();
            }}
            className={cn(itemClass, "text-danger hover:bg-danger-50 focus-visible:bg-danger-50")}
          >
            <Trash2 aria-hidden />
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );
}
