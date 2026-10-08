import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-full bg-surface-3", className)} />;
}

function SectionBone({ fields = 4 }: { fields?: number }) {
  return (
    <div className="rounded-[34px] bg-surface-3/60 p-1.5">
      <div className="rounded-card bg-surface p-6 sm:p-8">
        <div className="mb-7 flex items-center gap-4">
          <Bone className="size-11" />
          <div className="space-y-2">
            <Bone className="h-6 w-40 rounded-lg" />
            <Bone className="h-3.5 w-64" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: fields }, (_, i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-3.5 w-24" />
              <div className="h-12 animate-pulse rounded-field bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between py-3 pr-1.5 pl-6">
        <Bone className="h-3.5 w-48" />
        <Bone className="h-12 w-32 bg-surface" />
      </div>
    </div>
  );
}

/** Esqueleto de carga de ajustes. */
export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando ajustes…</span>
      <div className="space-y-3">
        <Bone className="h-4 w-56" />
        <Bone className="h-12 w-52 rounded-2xl sm:h-14" />
      </div>
      <div className="grid gap-8 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-10">
        <div className="hidden flex-col gap-5 xl:flex">
          <div className="h-[150px] animate-pulse rounded-card bg-surface" />
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Bone key={i} className="h-12 rounded-2xl bg-surface/70" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6 sm:gap-8">
          <SectionBone fields={4} />
          <SectionBone fields={3} />
        </div>
      </div>
    </div>
  );
}
