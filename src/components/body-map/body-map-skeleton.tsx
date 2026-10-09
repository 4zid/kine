import { BODY_GEOMETRY, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from "./geometry";

/** Esqueleto de carga del mapa (mismo encabezado y grilla que BodyMap, con la silueta real latiendo). */
export function BodyMapSkeleton() {
  const g = BODY_GEOMETRY.front;
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando mapa corporal…</span>
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2.5">
          <div className="h-7 w-48 animate-pulse rounded-full bg-surface" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-full bg-surface" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 flex-1 animate-pulse rounded-full bg-surface md:w-60 md:flex-none" />
          <div className="h-10 w-28 animate-pulse rounded-full bg-surface" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <div className="rounded-card bg-surface p-5 sm:p-7">
          <div className="flex justify-center gap-[8%]">
            {[0, 1].map((i) => (
              <svg
                key={i}
                viewBox={g.viewBox}
                aria-hidden
                className={i === 1 ? "hidden h-[min(560px,60vh)] sm:block" : "h-[min(560px,60vh)]"}
                style={{ aspectRatio: `${VIEWBOX_WIDTH} / ${VIEWBOX_HEIGHT}` }}
              >
                <path d={g.outline} className="animate-pulse fill-surface-2" />
              </svg>
            ))}
          </div>
          <div className="mt-6 grid gap-6 border-t border-line pt-5 md:grid-cols-2">
            <div className="h-12 animate-pulse rounded-2xl bg-surface-2" />
            <div className="h-12 animate-pulse rounded-2xl bg-surface-2" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="h-[212px] animate-pulse rounded-card bg-accent/15" />
          <div className="space-y-3 rounded-card bg-surface p-6">
            <div className="h-6 w-40 animate-pulse rounded-full bg-surface-2" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <div className="size-9 animate-pulse rounded-full bg-surface-2" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-surface-2" />
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-surface-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
