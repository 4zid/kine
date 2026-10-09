import Image, { type StaticImageData } from "next/image";
import type { CSSProperties } from "react";
import type { BodyView } from "@/lib/types";
import { cn, painColor } from "@/lib/utils";
import neutralBack from "./assets/neutral-back.svg";
import neutralFront from "./assets/neutral-front.svg";
import { FIGURE, isPainful, painEdge, regionAriaLabel } from "./figure-style";
import { PainLegend } from "./pain-legend";
import { BODY_GEOMETRY, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from "./geometry";
import type { RegionPain } from "./types";

type Props = {
  /** Estado actual por zona (id de src/lib/body-regions.ts). Las resueltas o con EVA 0 se ven neutras. */
  painByRegion: Record<string, RegionPain>;
  views?: BodyView[];
  size?: "sm" | "md" | "lg";
  /** Muestra "Frente / Espalda" y "Der. / Izq.". */
  showLabels?: boolean;
  /** Agrega la escala EVA debajo de las figuras. */
  showLegend?: boolean;
  className?: string;
};

const HEIGHTS = { sm: 200, md: 300, lg: 440 } as const;
const VIEW_LABELS: Record<BodyView, string> = { front: "Frente", back: "Espalda" };

/**
 * Silueta neutra de cada vista como archivo estático (generado por scripts/generate-geometry.mjs):
 * el navegador la cachea y en el HTML/RSC solo viajan los paths de las zonas con dolor.
 */
const NEUTRAL: Record<BodyView, StaticImageData> = { front: neutralFront, back: neutralBack };

const PRINT_EXACT: CSSProperties = { printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" };

/**
 * Vista estática del mapa corporal (sin hooks ni "use client"): sirve en Server Components, en el
 * resumen del paciente y en el informe imprimible. Los colores se conservan al imprimir
 * (print-color-adjust: exact) y las zonas con dolor llevan un borde oscuro que se distingue también
 * en escala de grises.
 */
export function BodyMapPreview({
  painByRegion,
  views = ["front", "back"],
  size = "md",
  showLabels = true,
  showLegend = false,
  className,
}: Props) {
  const height = HEIGHTS[size];
  const width = Math.round((height * VIEWBOX_WIDTH) / VIEWBOX_HEIGHT);
  const labelSize = size === "sm" ? "text-[10px]" : "text-[11px]";
  const stroke = size === "sm" ? 1 : 1.3;

  const figures = (
    <div
      className={cn(
        "flex max-w-full min-w-0 flex-wrap items-end justify-center gap-y-4",
        size === "sm" ? "gap-x-4" : "gap-x-6",
        !showLegend && className,
      )}
      style={PRINT_EXACT}
    >
      {views.map((view) => {
        const g = BODY_GEOMETRY[view];
        const painful = g.regions.filter((r) => isPainful(painByRegion[r.id]));
        return (
          <figure key={view} className="flex min-w-0 flex-col items-center gap-2">
            {/* Ancho fijo como máximo: en contenedores angostos la figura se achica (sin desbordar). */}
            <div className="relative max-w-full" style={{ width, aspectRatio: `${VIEWBOX_WIDTH} / ${VIEWBOX_HEIGHT}` }}>
              <Image
                src={NEUTRAL[view]}
                alt=""
                aria-hidden
                unoptimized
                loading="eager"
                fill
                sizes={`${width}px`}
                className="select-none"
                draggable={false}
              />
              <svg
                viewBox={g.viewBox}
                role="img"
                aria-label={`${VIEW_LABELS[view]}: ${
                  painful.length
                    ? painful.map((r) => regionAriaLabel(r.id, painByRegion[r.id])).join("; ")
                    : "sin zonas con dolor"
                }`}
                className="relative block h-auto w-full"
                style={PRINT_EXACT}
              >
                {painful.map((r) => (
                  <path
                    key={r.id}
                    d={r.d}
                    fill={painColor(painByRegion[r.id].intensity)}
                    stroke={FIGURE.gap}
                    strokeWidth={stroke}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {/* Borde oscuro de las zonas con dolor: el dolor leve se ve también en gris (impresión). */}
                {painful.map((r) => (
                  <path
                    key={`${r.id}-edge`}
                    d={r.d}
                    fill="none"
                    stroke={painEdge(painByRegion[r.id].intensity)}
                    strokeWidth={stroke}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
              {showLabels ? (
                <>
                  <span
                    aria-hidden
                    className={cn("absolute top-[4%] left-0 font-medium text-ink-2 print:text-ink", labelSize)}
                  >
                    {view === "front" ? "Der." : "Izq."}
                  </span>
                  <span
                    aria-hidden
                    className={cn("absolute top-[4%] right-0 font-medium text-ink-2 print:text-ink", labelSize)}
                  >
                    {view === "front" ? "Izq." : "Der."}
                  </span>
                </>
              ) : null}
            </div>
            {showLabels ? (
              <figcaption className={cn("font-medium tracking-[0.12em] text-muted uppercase", labelSize)}>
                {VIEW_LABELS[view]}
              </figcaption>
            ) : null}
          </figure>
        );
      })}
    </div>
  );

  if (!showLegend) return figures;
  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      {figures}
      <PainLegend className="w-full max-w-sm" />
    </div>
  );
}
