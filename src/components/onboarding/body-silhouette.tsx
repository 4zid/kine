import { useId } from "react";
import { cn, painColor } from "@/lib/utils";

/**
 * Media silueta (lado derecho del dibujo). Se espeja para formar el cuerpo completo.
 * viewBox 0 0 200 440, eje de simetría en x = 100.
 */
const HALF_BODY =
  "M99.5,46 L108,46 C108,56 108,64 110,70 C118,77 131,79 141,83 C152,88 158,96 159,108 " +
  "C161,128 163,150 164,172 C166,196 170,222 172,246 C174,258 176,270 172,280 C169,287 162,287 160,280 " +
  "C158,270 157,258 156,248 C153,226 150,204 147.5,182 C145.5,164 143.5,146 141,130 " +
  "C140,150 136,170 135,188 C135,204 140,216 142,232 C144,262 142,292 138,318 " +
  "C136,330 137,342 138,354 C139,372 136,392 132,410 C131,418 136,424 136,430 " +
  "C136,435 130,436 122,436 L114,436 C111,436 110,432 111,428 C112,414 112,398 111,382 " +
  "C110,364 109,346 110,330 C110,300 106,276 101,260 L99.5,260 Z";

export type SilhouetteDot = {
  /** Coordenadas en el viewBox 0 0 200 440. */
  x: number;
  y: number;
  intensity: number;
  label?: string;
};

/** Silueta humana simple y elegante con puntos de dolor que laten. */
export function BodySilhouette({
  view = "front",
  dots = [],
  className,
  activeIndex,
}: {
  view?: "front" | "back";
  dots?: SilhouetteDot[];
  className?: string;
  /** Punto destacado (anillo más visible). */
  activeIndex?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const halfId = `half-${uid}`;
  const glowId = `glow-${uid}`;

  return (
    <svg viewBox="0 0 200 440" className={cn("h-full w-auto", className)} aria-hidden>
      <defs>
        <path id={halfId} d={HALF_BODY} />
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="text-surface-3" fill="currentColor">
        <ellipse cx="100" cy="28" rx="19.5" ry="23" />
        <use href={`#${halfId}`} />
        <use href={`#${halfId}`} transform="matrix(-1 0 0 1 200 0)" />
      </g>

      {/* Detalles anatómicos sutiles */}
      <g fill="none" stroke="var(--color-line-strong)" strokeWidth="1.2" strokeLinecap="round" opacity="0.9">
        {view === "back" ? (
          <>
            <path d="M100,78 L100,236" strokeDasharray="2 5" />
            <path d="M118,104 C126,112 128,130 120,142" />
            <path d="M82,104 C74,112 72,130 80,142" />
            <path d="M88,232 C94,240 106,240 112,232" />
          </>
        ) : (
          <>
            <path d="M84,100 C92,106 108,106 116,100" />
            <path d="M100,150 L100,200" strokeDasharray="2 5" />
            <path d="M118,318 C122,324 122,332 118,336" />
            <path d="M82,318 C78,324 78,332 82,336" />
          </>
        )}
      </g>

      {dots.map((d, i) => {
        const color = painColor(d.intensity);
        const active = i === activeIndex;
        return (
          <g key={`${d.x}-${d.y}`} style={{ color }}>
            <circle cx={d.x} cy={d.y} r={active ? 26 : 20} fill={`url(#${glowId})`} />
            <circle
              cx={d.x}
              cy={d.y}
              r={active ? 11 : 9}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="origin-center animate-pulse-ring [transform-box:fill-box]"
              style={{ animationDelay: `${i * 450}ms` }}
            />
            <circle cx={d.x} cy={d.y} r={active ? 7 : 5.5} fill="currentColor" stroke="#fff" strokeWidth="2" />
          </g>
        );
      })}
    </svg>
  );
}
