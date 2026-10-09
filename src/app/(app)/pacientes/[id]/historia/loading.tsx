function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-surface-3/80 ${className}`} />;
}

/** Esqueleto de la historia clínica (índice + tarjetas de sección). */
export default function ClinicalHistoryLoading() {
  return (
    <div role="status" aria-busy="true" className="animate-fade-in">
      <span className="sr-only">Cargando historia clínica…</span>
      <div className="mb-6 space-y-2.5">
        <Bar className="h-7 w-48" />
        <Bar className="h-4 w-80 max-w-full" />
      </div>
      <div className="mb-4 flex gap-1.5 overflow-hidden xl:hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Bar key={i} className="h-9 w-28 shrink-0" />
        ))}
      </div>
      <div className="xl:grid xl:grid-cols-[228px_minmax(0,1fr)] xl:gap-5">
        <div className="hidden xl:block">
          <div className="rounded-card bg-surface p-5">
            <Bar className="h-3 w-20" />
            <Bar className="mt-3 h-10 w-24" />
            <div className="mt-4 flex gap-1">
              {Array.from({ length: 9 }, (_, i) => (
                <Bar key={i} className="h-1.5 flex-1" />
              ))}
            </div>
            <div className="mt-6 space-y-3">
              {Array.from({ length: 9 }, (_, i) => (
                <Bar key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          {[0, 1, 2].map((card) => (
            <div key={card} className="rounded-card bg-surface p-5 sm:p-8">
              <Bar className="h-3 w-6" />
              <Bar className="mt-3 h-7 w-56" />
              <Bar className="mt-3 h-4 w-72 max-w-full" />
              <div className="mt-7 flex flex-wrap gap-2">
                {Array.from({ length: card === 0 ? 10 : 4 }, (_, i) => (
                  <Bar key={i} className="h-8 w-28" />
                ))}
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="h-24 animate-pulse rounded-field bg-surface-2" />
                <div className="h-24 animate-pulse rounded-field bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
