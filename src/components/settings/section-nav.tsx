"use client";

import { BadgeCheck, Building, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { SETTINGS_SECTIONS, type SettingsSectionId } from "@/components/settings/limits";

const ICONS: Record<SettingsSectionId, LucideIcon> = {
  perfil: UserRound,
  "datos-profesionales": BadgeCheck,
  consultorio: Building,
  cuenta: ShieldCheck,
};

/** Sección visible según el scroll (IntersectionObserver). */
function useActiveSection() {
  const [active, setActive] = useState<SettingsSectionId>(SETTINGS_SECTIONS[0].id);

  useEffect(() => {
    const elements = SETTINGS_SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id as SettingsSectionId);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const go = (id: SettingsSectionId) => (event: MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    setActive(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  };

  return { active, go };
}

/** Índice de secciones: "rail" (columna fija en desktop) o "pills" (barra horizontal fija en mobile). */
export function SectionNav({ variant, className }: { variant: "rail" | "pills"; className?: string }) {
  const { active, go } = useActiveSection();

  if (variant === "pills") {
    return (
      <nav
        aria-label="Secciones de ajustes"
        className={cn(
          "scrollbar-none sticky top-16 z-10 -mx-4 overflow-x-auto bg-canvas/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8",
          className,
        )}
      >
        <ul className="flex w-full min-w-max items-center gap-0.5 rounded-full bg-surface p-1 shadow-inset sm:inline-flex sm:w-auto sm:gap-1">
          {SETTINGS_SECTIONS.map(({ id, label, short }) => (
            <li key={id} className="flex-1 sm:flex-none">
              <a
                href={`#${id}`}
                onClick={go(id)}
                aria-current={active === id ? "true" : undefined}
                className={cn(
                  "inline-flex h-10 w-full items-center justify-center rounded-full px-3 text-[13px] font-medium whitespace-nowrap transition-colors sm:px-4 sm:text-sm",
                  active === id ? "bg-ink text-white" : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Secciones de ajustes" className={className}>
      <ul className="flex flex-col gap-1">
        {SETTINGS_SECTIONS.map(({ id, label }) => {
          const Icon = ICONS[id];
          const current = active === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={go(id)}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "relative flex h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] transition-colors [&_svg]:size-[18px]",
                  current ? "bg-surface font-medium text-ink shadow-soft" : "text-ink-2 hover:bg-surface/60",
                )}
              >
                <Icon strokeWidth={1.7} aria-hidden />
                {label}
                {current ? <span aria-hidden className="ml-auto size-1.5 rounded-full bg-brand" /> : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
