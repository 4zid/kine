import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-full bg-surface-3", className)} />;
}

/** Esqueleto de carga del inicio (misma grilla que DashboardView). */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando tu inicio…</span>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Bone className="h-4 w-48" />
          <Bone className="h-12 w-72 rounded-2xl sm:h-14 sm:w-96" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-11 w-36" />
          <Bone className="h-11 w-40 bg-ink/15" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="relative min-h-[300px] animate-pulse overflow-hidden rounded-card bg-accent/25 sm:min-h-[340px] xl:col-span-7" />
        <div className="flex min-h-[300px] flex-col rounded-card bg-surface p-6 sm:p-8 xl:col-span-5">
          <Bone className="h-7 w-36" />
          <Bone className="mt-6 h-20 w-40 rounded-3xl" />
          <div className="mt-auto grid grid-cols-7 gap-2 pt-8">
            {Array.from({ length: 7 }, (_, i) => (
              <Bone key={i} className="h-2.5" />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <Bone className="h-4 w-24" />
            <Bone className="h-8 w-40 rounded-xl" />
          </div>
          <div className="flex gap-2">
            <Bone className="size-11" />
            <Bone className="size-11" />
            <Bone className="h-11 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-[84px] animate-pulse rounded-[18px] bg-surface sm:h-[112px] sm:rounded-[22px]" />
          ))}
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <div className="rounded-card bg-surface p-4 xl:col-span-7">
          <div className="space-y-2 px-2 pt-2 pb-4">
            <Bone className="h-4 w-32" />
            <Bone className="h-8 w-64 rounded-xl" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-[104px] animate-pulse rounded-panel bg-surface-2" />
            ))}
          </div>
        </div>
        <div className="rounded-card bg-surface p-6 sm:p-7 xl:col-span-5">
          <Bone className="h-7 w-52" />
          <Bone className="mt-3 h-4 w-64" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Bone className="size-11" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-40" />
                  <Bone className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
