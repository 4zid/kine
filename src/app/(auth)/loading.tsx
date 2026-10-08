/** Esqueleto del layout dividido mientras carga una pantalla de acceso. */
export default function AuthLoading() {
  return (
    <div className="flex min-h-dvh gap-4 p-2 sm:p-3 lg:p-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="hidden w-[44%] max-w-[700px] shrink-0 animate-pulse rounded-card bg-ink/90 lg:block" />
      <div className="flex min-w-0 flex-1 flex-col rounded-[24px] bg-surface px-5 pt-4 pb-5 sm:rounded-card sm:px-10 sm:pt-7 lg:px-12 xl:px-16">
        <div className="flex h-11 items-center justify-between">
          <div className="size-9 animate-pulse rounded-full bg-surface-2 lg:invisible" />
          <div className="h-4 w-32 animate-pulse rounded-full bg-surface-2" />
        </div>
        <div className="flex flex-1 flex-col justify-center py-12">
          <div className="mx-auto w-full max-w-[440px] space-y-4">
            <div className="h-4 w-28 animate-pulse rounded-full bg-surface-2" />
            <div className="h-10 w-3/4 animate-pulse rounded-2xl bg-surface-2" />
            <div className="h-10 w-1/2 animate-pulse rounded-2xl bg-surface-2" />
            <div className="h-4 w-full animate-pulse rounded-full bg-surface-2" />
            <div className="space-y-3 pt-6">
              <div className="h-12 animate-pulse rounded-field bg-surface-2" />
              <div className="h-12 animate-pulse rounded-field bg-surface-2" />
              <div className="h-14 animate-pulse rounded-full bg-surface-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
