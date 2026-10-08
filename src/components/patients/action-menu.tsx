"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type ActionMenuItem =
  | {
      type?: "item";
      key: string;
      label: string;
      icon?: ReactNode;
      href?: string;
      onSelect?: () => void;
      tone?: "default" | "danger";
      disabled?: boolean;
    }
  | { type: "separator"; key: string };

type Props = {
  items: ActionMenuItem[];
  /** Nombre accesible del botón (p. ej. "Acciones para María Gómez"). */
  label: string;
  pending?: boolean;
  /** Estilo del disparador: redondo blanco (encabezado) o fantasma (filas). */
  variant?: "round" | "ghost";
  className?: string;
};

/** Menú desplegable accesible ("…") con navegación por teclado. */
export function ActionMenu({ items, label, pending = false, variant = "ghost", className }: Props) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const focusItem = (index: number) => {
    const nodes = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])');
    if (!nodes || nodes.length === 0) return;
    const i = (index + nodes.length) % nodes.length;
    nodes[i]?.focus();
  };

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const toggle = () => {
    if (pending) return;
    if (open) return close();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPlacement(window.innerHeight - rect.bottom < 300 && rect.top > 300 ? "top" : "bottom");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => focusItem(0));
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  const onMenuKeyDown = (e: KeyboardEvent) => {
    const nodes = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [],
    );
    const current = nodes.indexOf(document.activeElement as HTMLElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(nodes.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  const itemClass = (tone: "default" | "danger" = "default", disabled?: boolean) =>
    cn(
      "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset [&_svg]:size-[18px] [&_svg]:shrink-0",
      tone === "danger"
        ? "text-ink hover:bg-danger-50 focus-visible:bg-danger-50 focus-visible:ring-danger [&_svg]:text-danger"
        : "text-ink hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-ink",
      disabled && "pointer-events-none opacity-45",
    );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        // aria-disabled (no disabled): mientras se guarda el botón conserva el foco del teclado.
        aria-disabled={pending || undefined}
        aria-busy={pending || undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open && !pending) {
            e.preventDefault();
            toggle();
          }
        }}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-colors aria-disabled:cursor-progress aria-disabled:opacity-60 [&_svg]:size-5",
          variant === "round"
            ? "size-11 bg-surface text-ink shadow-inset hover:bg-surface-2"
            : "size-10 text-muted hover:bg-surface-3/70 hover:text-ink",
          open && (variant === "round" ? "bg-surface-2" : "bg-surface-3/70 text-ink"),
        )}
      >
        {pending ? <Spinner /> : <Ellipsis />}
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute right-0 z-40 w-60 animate-scale-in rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-ink/5",
            placement === "bottom" ? "top-full mt-2 origin-top-right" : "bottom-full mb-2 origin-bottom-right",
          )}
        >
          {items.map((item) => {
            if (item.type === "separator") return <div key={item.key} role="separator" className="my-1.5 h-px bg-line" />;
            if (item.href && !item.disabled) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => close(false)}
                  className={itemClass(item.tone)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                onClick={() => {
                  // Devolver el foco al disparador antes de actuar: así un diálogo que se abra
                  // lo recuerda como elemento a restaurar al cerrarse (y el foco no cae en <body>).
                  close(true);
                  const select = item.onSelect;
                  if (select) requestAnimationFrame(() => select());
                }}
                className={itemClass(item.tone, item.disabled)}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
