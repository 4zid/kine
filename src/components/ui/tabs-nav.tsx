"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn, scrollBehavior } from "@/lib/utils";

export type TabItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  exact?: boolean;
  /** Texto más corto para pantallas chicas (< sm), p. ej. "Historia" en vez de "Historia clínica". */
  shortLabel?: string;
};

/**
 * Pestañas de navegación por ruta (píldoras), con scroll horizontal en mobile.
 * La pestaña activa siempre queda a la vista (también al entrar por un enlace directo) y un
 * degradé en el borde indica que hay más pestañas hacia ese lado.
 */
export function TabsNav({ items, className }: { items: TabItem[]; className?: string }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const firstRun = useRef(true);

  const updateEdges = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const max = nav.scrollWidth - nav.clientWidth;
    const next = { start: nav.scrollLeft > 4, end: max > 4 && nav.scrollLeft < max - 4 };
    setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);

  // Centra la pestaña activa si no entra completa (sin animación la primera vez).
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active && nav.scrollWidth > nav.clientWidth) {
      const navBox = nav.getBoundingClientRect();
      const box = active.getBoundingClientRect();
      const hidden = box.left < navBox.left + 8 || box.right > navBox.right - 8;
      if (hidden) {
        const left = nav.scrollLeft + (box.left - navBox.left) - (nav.clientWidth - box.width) / 2;
        nav.scrollTo({ left, behavior: firstRun.current ? "auto" : scrollBehavior() });
      }
    }
    firstRun.current = false;
    const frame = requestAnimationFrame(updateEdges);
    return () => cancelAnimationFrame(frame);
  }, [pathname, updateEdges]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateEdges);
    observer?.observe(nav);
    return () => observer?.disconnect();
  }, [updateEdges]);

  const mask =
    edges.start && edges.end
      ? "[mask-image:linear-gradient(to_right,transparent,black_28px,black_calc(100%_-_28px),transparent)]"
      : edges.end
        ? "[mask-image:linear-gradient(to_right,black_calc(100%_-_36px),transparent)]"
        : edges.start
          ? "[mask-image:linear-gradient(to_right,transparent,black_36px)]"
          : undefined;

  return (
    <nav
      ref={navRef}
      aria-label="Secciones"
      onScroll={updateEdges}
      className={cn("scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", mask, className)}
    >
      <ul className="inline-flex min-w-max items-center gap-1 rounded-full bg-surface p-1 shadow-inset">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors [&_svg]:size-4",
                  active ? "bg-ink text-white" : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                {item.icon}
                {item.shortLabel ? (
                  <>
                    <span className="sm:hidden">{item.shortLabel}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </>
                ) : (
                  item.label
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
