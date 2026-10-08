import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-full bg-line-strong/60", className)} />;
}

/** Carga de la evolución: encabezado, resumen + gráfico y tarjetas de sesión. */
export function SessionsSkeleton() {
  return (
    <div className="flex flex-col gap-8" role="status" aria-label="Cargando sesiones">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Bone className="h-4 w-56" />
          <Bone className="h-10 w-48" />
        </div>
        <Bone className="h-14 w-44" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-5">
        <div className="h-[380px] animate-pulse rounded-card bg-accent/25" />
        <div className="rounded-card bg-surface p-7">
          <Bone className="h-6 w-44" />
          <Bone className="mt-3 h-4 w-64" />
          <div className="mt-10 flex h-[200px] items-end gap-5">
            {[60, 80, 50, 70, 40, 55, 35, 45].map((h, i) => (
              <div key={i} className="flex h-full flex-1 items-end justify-center gap-[2px]">
                <div className="w-4 animate-pulse rounded-t-[4px] bg-line-strong/60" style={{ height: `${h}%` }} />
                <div className="w-4 animate-pulse rounded-t-[4px] bg-line/80" style={{ height: `${h * 0.7}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Bone className="ml-1 h-6 w-40" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-5 rounded-card bg-surface p-5">
            <div className="h-[92px] w-[76px] shrink-0 animate-pulse rounded-[20px] bg-surface-2" />
            <div className="flex-1 space-y-3 pt-1">
              <Bone className="h-6 w-40" />
              <Bone className="h-4 w-56" />
              <div className="flex gap-2 pt-1">
                <Bone className="h-7 w-28" />
                <Bone className="h-7 w-24" />
                <Bone className="h-7 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando sesiones…</span>
    </div>
  );
}

/** Carga del formulario de sesión. */
export function SessionFormSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Cargando formulario">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Bone className="h-4 w-32" />
          <Bone className="h-10 w-72" />
        </div>
        <Bone className="h-12 w-80 max-w-full" />
      </div>
      <div className="rounded-[34px] bg-surface-3/70 p-2">
        <div className="space-y-9 rounded-card bg-surface p-5 sm:p-8">
          <div className="space-y-3">
            <Bone className="h-4 w-40" />
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="h-[66px] animate-pulse rounded-2xl bg-surface-2 sm:h-[84px]" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Bone className="h-4 w-16" />
            <Bone className="h-14 w-44 rounded-2xl" />
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Bone key={i} className="h-10 w-20" />
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-32 animate-pulse rounded-panel bg-surface-2" />
            <div className="h-32 animate-pulse rounded-panel bg-surface-2" />
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-5">
          <Bone className="h-4 w-64" />
          <Bone className="h-14 w-48 bg-surface" />
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
