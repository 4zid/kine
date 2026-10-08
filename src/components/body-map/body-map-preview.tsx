import type { CSSProperties } from "react";
import type { BodyView } from "@/lib/types";
import { cn, painColor } from "@/lib/utils";
import { FIGURE, isPainful, regionAriaLabel } from "./figure-style";
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

const PRINT_EXACT: CSSProperties = { printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" };

/**
 * Vista estática del mapa corporal (SVG puro, sin hooks ni "use client"): sirve en Server
 * Components, en el resumen del paciente y en el informe imprimible. Los colores se conservan al
 * imprimir (print-color-adjust: exact).
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

  const figures = (
    <div className={cn("flex flex-wrap items-end justify-center gap-x-6 gap-y-4", !showLegend && className)} style={PRINT_EXACT}>
      {views.map((view) => {
        const g = BODY_GEOMETRY[view];
        const painful = g.regions.filter((r) => isPainful(painByRegion[r.id]));
        return (
          <figure key={view} className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width, height }}>
              <svg
                viewBox={g.viewBox}
                width={width}
                height={height}
                role="img"
                aria-label={`${VIEW_LABELS[view]}: ${
                  painful.length
                    ? painful.map((r) => regionAriaLabel(r.id, painByRegion[r.id])).join("; ")
                    : "sin zonas con dolor"
                }`}
                className="block"
                style={PRINT_EXACT}
              >
                {g.regions.map((r) => {
                  const p = painByRegion[r.id];
                  return (
                    <path
                      key={r.id}
                      d={r.d}
                      fill={isPainful(p) ? painColor(p.intensity) : FIGURE.neutral}
                      stroke={FIGURE.gap}
                      strokeWidth={size === "sm" ? 1 : 1.3}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
              {showLabels ? (
                <>
                  <span
                    aria-hidden
                    className={cn("absolute top-[4%] left-0 font-medium text-subtle", labelSize)}
                  >
                    {view === "front" ? "Der." : "Izq."}
                  </span>
                  <span
                    aria-hidden
                    className={cn("absolute top-[4%] right-0 font-medium text-subtle", labelSize)}
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
