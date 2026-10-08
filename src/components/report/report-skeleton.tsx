function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-full bg-line-strong/60 ${className ?? ""}`} />;
}

/** Carga del informe. */
export function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6 print:hidden" role="status" aria-label="Cargando informe">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Bone className="h-12 w-[420px] max-w-full" />
        <Bone className="h-14 w-48" />
      </div>
      <div className="space-y-3 pt-2">
        <Bone className="h-4 w-72" />
        <Bone className="h-12 w-96 max-w-full" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-card bg-surface p-7">
            <Bone className="h-3 w-24" />
            <Bone className="h-7 w-56" />
            <Bone className="h-4 w-64" />
            <div className="grid grid-cols-2 gap-4 pt-3">
              <Bone className="h-9 w-full rounded-xl" />
              <Bone className="h-9 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="h-[340px] animate-pulse rounded-card bg-accent/25" />
        <div className="h-[340px] animate-pulse rounded-card bg-surface" />
      </div>
      <div className="h-64 animate-pulse rounded-card bg-surface" />
      <span className="sr-only">Cargando informe…</span>
    </div>
  );
}
