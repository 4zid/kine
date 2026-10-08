import type { CSSProperties } from "react";

function Bar({ className, style }: { className: string; style?: CSSProperties }) {
  return <div className={`animate-pulse rounded-full bg-surface-3/80 ${className}`} style={style} />;
}

/** Esqueleto de la pestaña de estudios. */
export default function StudiesLoading() {
  return (
    <div aria-busy="true" aria-label="Cargando estudios" className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Bar className="h-9 w-72 max-w-full" />
          <Bar className="h-4 w-56" />
        </div>
        <Bar className="h-11 w-44" />
      </div>
      <div className="mb-5 flex gap-2">
        {[64, 56, 60, 52].map((w, i) => (
          <Bar key={i} className="h-8" style={{ width: w }} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-card bg-surface p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <Bar className="h-8 w-20" />
              <Bar className="h-4 w-20" />
            </div>
            <Bar className="mt-5 h-6 w-3/4" />
            <Bar className="mt-3 h-4 w-full" />
            <Bar className="mt-2 h-4 w-2/3" />
            <div className="mt-5 h-16 animate-pulse rounded-panel bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
