import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PanelTone = "green" | "blue";

/**
 * Fondos de los paneles oscuros (referencia daily: verde-negro y azul eléctrico profundo).
 * Se construyen con los tokens del tema para que cambien junto con la paleta.
 */
const BACKGROUNDS: Record<PanelTone, string> = {
  green: [
    "radial-gradient(90% 70% at 100% 100%, color-mix(in oklab, var(--color-brand-500) 62%, transparent) 0%, transparent 62%)",
    "radial-gradient(70% 50% at 0% 0%, color-mix(in oklab, var(--color-brand-700) 55%, transparent) 0%, transparent 70%)",
    "linear-gradient(160deg, var(--color-ink) 0%, color-mix(in oklab, var(--color-brand-900) 70%, var(--color-ink)) 55%, var(--color-brand-900) 100%)",
  ].join(", "),
  blue: [
    "radial-gradient(95% 75% at 100% 100%, color-mix(in oklab, var(--color-accent) 85%, transparent) 0%, transparent 65%)",
    "radial-gradient(70% 50% at 0% 0%, color-mix(in oklab, var(--color-accent-700) 45%, transparent) 0%, transparent 70%)",
    "linear-gradient(160deg, var(--color-ink) 0%, var(--color-accent-900) 60%, color-mix(in oklab, var(--color-accent-900) 60%, var(--color-accent)) 100%)",
  ].join(", "),
};

/** Círculos de línea fina y puntos, pensados para paneles verticales. */
export function PanelDecor({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full text-white", className)}
      viewBox="0 0 600 700"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <circle cx="140" cy="-30" r="270" strokeOpacity="0.13" />
      <circle cx="610" cy="780" r="320" strokeOpacity="0.12" />
      <circle cx="700" cy="470" r="190" strokeOpacity="0.1" />
      <circle cx="-60" cy="640" r="170" strokeOpacity="0.09" />
      <circle cx="96" cy="560" r="22" strokeOpacity="0.16" />
      <circle cx="452" cy="218" r="4" fill="currentColor" fillOpacity="0.45" stroke="none" />
      <circle cx="132" cy="612" r="3.5" fill="currentColor" fillOpacity="0.32" stroke="none" />
      <circle cx="540" cy="360" r="2.5" fill="currentColor" fillOpacity="0.25" stroke="none" />
    </svg>
  );
}

/**
 * Panel oscuro redondeado con gradiente por tono. Ambos gradientes se apilan y se
 * cruzan con opacidad, así el cambio de tono (p. ej. entre pasos del onboarding) es suave.
 */
export function DarkPanel({
  tone = "green",
  className,
  children,
}: {
  tone?: PanelTone;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("relative isolate overflow-hidden bg-ink text-white", className)}>
      {(Object.keys(BACKGROUNDS) as PanelTone[]).map((t) => (
        <div
          key={t}
          aria-hidden
          className={cn(
            "absolute inset-0 -z-10 transition-opacity duration-700 ease-out",
            t === tone ? "opacity-100" : "opacity-0",
          )}
          style={{ background: BACKGROUNDS[t] }}
        />
      ))}
      <PanelDecor className="-z-10" />
      {children}
    </div>
  );
}
