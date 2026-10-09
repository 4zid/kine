"use client";

import { useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import { SECTIONS, sectionDomId, type SectionId } from "@/components/clinical-history/sections";
import { cn } from "@/lib/utils";

type Status = { hasData: Record<SectionId, boolean>; errors: Partial<Record<SectionId, number>> };

/** "smooth", salvo que el usuario pida menos movimiento (prefers-reduced-motion). */
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** Desplaza suavemente hasta una sección y mueve el foco a su título. */
export function scrollToSection(id: SectionId) {
  const el = document.getElementById(sectionDomId(id));
  if (!el) return;
  el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  document.getElementById(`${sectionDomId(id)}-title`)?.focus({ preventScroll: true });
}

/** Sección visible según el scroll (banda en el tercio superior de la pantalla). */
function useActiveSection(lockRef: RefObject<number>) {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id);
  useEffect(() => {
    const visible = new Set<SectionId>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.section as SectionId | undefined;
          if (!id) continue;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        if ((entries[0]?.time ?? 0) < lockRef.current) return;
        const first = SECTIONS.find((s) => visible.has(s.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(sectionDomId(s.id));
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [lockRef]);
  return [active, setActive] as const;
}

function StatusDot({ hasData, errors, onDark }: { hasData: boolean; errors: number; onDark?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2 shrink-0 rounded-full",
        errors > 0
          ? "bg-danger"
          : hasData
            ? "bg-success"
            : onDark
              ? "shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.55)]"
              : "shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]",
      )}
    />
  );
}

/**
 * Índice de secciones con indicador de completitud.
 * Desktop (xl): tarjeta fija a la izquierda. Mobile/tablet: barra de chips horizontal.
 */
export function SectionIndex({ hasData, errors, variant }: Status & { variant: "desktop" | "mobile" }) {
  const lockRef = useRef(0);
  const [active, setActive] = useActiveSection(lockRef);
  const barRef = useRef<HTMLDivElement>(null);
  const done = SECTIONS.filter((s) => hasData[s.id]).length;
  const percent = Math.round((done / SECTIONS.length) * 100);

  // Mantener visible el chip activo en la barra mobile.
  useEffect(() => {
    const bar = barRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    if (!bar || !chip || bar.scrollWidth <= bar.clientWidth) return;
    const left = chip.offsetLeft - bar.clientWidth / 2 + chip.offsetWidth / 2;
    bar.scrollTo({ left: Math.max(0, left), behavior: scrollBehavior() });
  }, [active]);

  const go = (e: MouseEvent<HTMLAnchorElement>, id: SectionId) => {
    e.preventDefault();
    lockRef.current = e.timeStamp + 900;
    setActive(id);
    scrollToSection(id);
  };

  const label = (id: SectionId) => {
    const n = errors[id] ?? 0;
    return n > 0
      ? `, ${n} ${n === 1 ? "campo a revisar" : "campos a revisar"}`
      : hasData[id]
        ? ", con datos"
        : ", pendiente";
  };

  if (variant === "desktop") {
    return (
      <nav aria-label="Secciones de la historia clínica" className="sticky top-8 hidden xl:block">
        <div className="rounded-card bg-surface p-5">
          <p className="text-[13px] font-medium text-muted">Completitud</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <p className="display tabular text-[44px] font-medium text-ink">
              {percent}
              <span className="text-[26px]">%</span>
            </p>
            <span className="tabular mb-1.5 inline-flex h-8 items-center rounded-full bg-surface-2 px-3 text-[13px] font-medium whitespace-nowrap text-ink-2">
              {done} de {SECTIONS.length}
            </span>
          </div>
          <p className="sr-only">
            {done} de {SECTIONS.length} secciones con datos
          </p>
          <div className="mt-3 flex gap-1" aria-hidden>
            {SECTIONS.map((s) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  errors[s.id] ? "bg-danger" : hasData[s.id] ? "bg-accent" : "bg-line",
                )}
              />
            ))}
          </div>

          <ol className="mt-5 -mx-1 flex flex-col gap-0.5">
            {SECTIONS.map((s, i) => {
              const isActive = active === s.id;
              return (
                <li key={s.id}>
                  <a
                    href={`#${sectionDomId(s.id)}`}
                    onClick={(e) => go(e, s.id)}
                    aria-current={isActive ? "location" : undefined}
                    aria-label={`${s.title}${label(s.id)}`}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-2xl px-3 text-[14px] transition-colors",
                      isActive ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2/70",
                    )}
                  >
                    <span aria-hidden className="tabular w-5 text-[12px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate">{s.short}</span>
                    <StatusDot hasData={hasData[s.id]} errors={errors[s.id] ?? 0} />
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Secciones de la historia clínica"
      className="sticky top-16 z-20 -mx-4 mb-4 bg-canvas/85 py-2 backdrop-blur-md sm:-mx-6 lg:top-0 lg:-mx-8 xl:hidden"
    >
      <div ref={barRef} className="scrollbar-none flex items-center gap-1.5 overflow-x-auto px-4 sm:px-6 lg:px-8">
        <span className="tabular inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-ink px-3 text-[13px] font-semibold text-white">
          <span className="sr-only">
            {done} de {SECTIONS.length} secciones con datos
          </span>
          <span aria-hidden className="relative size-4">
            <svg viewBox="0 0 20 20" className="size-4 -rotate-90">
              <circle cx="10" cy="10" r="8" fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="3" />
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(percent / 100) * 50.27} 50.27`}
              />
            </svg>
          </span>
          <span aria-hidden>
            {done}/{SECTIONS.length}
          </span>
        </span>
        {SECTIONS.map((s) => {
          const isActive = active === s.id;
          return (
            <a
              key={s.id}
              data-chip={s.id}
              href={`#${sectionDomId(s.id)}`}
              onClick={(e) => go(e, s.id)}
              aria-current={isActive ? "location" : undefined}
              aria-label={`${s.title}${label(s.id)}`}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                isActive ? "bg-ink text-white" : "bg-surface text-ink-2 shadow-inset hover:bg-surface-2",
              )}
            >
              <StatusDot hasData={hasData[s.id]} errors={errors[s.id] ?? 0} onDark={isActive} />
              {s.short}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
