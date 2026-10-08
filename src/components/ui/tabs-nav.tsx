"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabItem = { href: string; label: string; icon?: ReactNode; exact?: boolean };

/** Pestañas de navegación por ruta (píldoras), con scroll horizontal en mobile. */
export function TabsNav({ items, className }: { items: TabItem[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones" className={cn("scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
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
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
