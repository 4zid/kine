import { cn } from "@/lib/utils";

/**
 * Círculos de línea fina decorativos (como los de las tarjetas azules y el onboarding).
 * Usar dentro de un contenedor `relative overflow-hidden`.
 */
export function DecorCircles({ className, variant = "a" }: { className?: string; variant?: "a" | "b" | "c" }) {
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      viewBox="0 0 600 400"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      {variant === "a" && (
        <>
          <circle cx="180" cy="60" r="210" strokeOpacity="0.35" />
          <circle cx="470" cy="420" r="190" strokeOpacity="0.3" />
          <circle cx="540" cy="250" r="34" strokeOpacity="0.3" />
          <circle cx="395" cy="48" r="4" fill="currentColor" fillOpacity="0.9" stroke="none" />
          <circle cx="40" cy="178" r="3" fill="currentColor" fillOpacity="0.6" stroke="none" />
        </>
      )}
      {variant === "b" && (
        <>
          <circle cx="60" cy="-40" r="260" strokeOpacity="0.25" />
          <circle cx="560" cy="380" r="240" strokeOpacity="0.2" />
          <circle cx="430" cy="120" r="5" fill="currentColor" fillOpacity="0.5" stroke="none" />
          <circle cx="120" cy="330" r="5" fill="currentColor" fillOpacity="0.4" stroke="none" />
        </>
      )}
      {variant === "c" && (
        <>
          <circle cx="520" cy="-20" r="180" strokeOpacity="0.3" />
          <circle cx="-20" cy="420" r="200" strokeOpacity="0.25" />
        </>
      )}
    </svg>
  );
}
