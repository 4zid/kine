/** Esqueleto del recorrido (panel oscuro + texto). */
export default function BienvenidaLoading() {
  return (
    <div className="flex min-h-dvh flex-col gap-2 p-2 sm:gap-3 sm:p-3 lg:h-dvh lg:flex-row lg:gap-0 lg:p-4" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <div className="h-[46dvh] max-h-[520px] min-h-[300px] shrink-0 animate-pulse rounded-[24px] bg-ink/90 sm:rounded-card lg:h-auto lg:max-h-none lg:w-1/2 xl:w-[55%]" />
      <div className="flex flex-1 flex-col justify-center gap-4 px-3 py-6 sm:px-8 lg:px-[clamp(2.5rem,4.6vw,6.5rem)]">
        <div className="h-4 w-40 animate-pulse rounded-full bg-surface-3" />
        <div className="h-11 w-4/5 max-w-[480px] animate-pulse rounded-2xl bg-surface-3" />
        <div className="h-11 w-3/5 max-w-[420px] animate-pulse rounded-2xl bg-surface-3" />
        <div className="h-4 w-full max-w-[460px] animate-pulse rounded-full bg-surface-3" />
        <div className="h-4 w-2/3 max-w-[360px] animate-pulse rounded-full bg-surface-3" />
      </div>
    </div>
  );
}
