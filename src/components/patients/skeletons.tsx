import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Bloque de carga (hueso del esqueleto). */
export function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-full bg-surface-3/80", className)} />;
}

function Loading({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Esqueleto del listado de pacientes. */
export function PatientsListSkeleton() {
  return (
    <Loading label="Cargando pacientes…" className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-3">
          <Bone className="h-4 w-36 bg-line-strong/70" />
          <Bone className="h-12 w-56 rounded-2xl bg-line-strong/70 sm:h-14" />
        </div>
        <Bone className="hidden h-14 w-48 bg-line-strong/70 sm:block" />
      </div>
      <div className="flex flex-col gap-3 xl:flex-row xl:justify-between">
        <Bone className="h-11 w-full max-w-[460px] bg-surface" />
        <div className="flex gap-3">
          <Bone className="h-11 flex-1 bg-surface xl:w-[300px]" />
          <Bone className="h-11 w-56 bg-surface" />
        </div>
      </div>
      <div className="rounded-card bg-surface p-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <Bone className="size-11 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-24" />
            </div>
            <Bone className="hidden h-4 w-64 lg:block" />
            <Bone className="hidden h-4 w-24 sm:block" />
            <Bone className="h-6 w-14" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

/** Esqueleto del contenido de una pestaña (grilla de tarjetas). */
export function PatientTabSkeleton() {
  return (
    <Loading label="Cargando…" className="grid gap-4 lg:gap-5 xl:grid-cols-12">
      <div className="space-y-4 rounded-card bg-surface p-6 sm:p-7 xl:col-span-7">
        <Bone className="h-6 w-48 rounded-xl" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-4/5" />
        <Bone className="h-4 w-2/3" />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Bone className="h-20 rounded-panel" />
          <Bone className="h-20 rounded-panel" />
        </div>
      </div>
      <div className="min-h-[260px] animate-pulse rounded-card bg-accent/25 xl:col-span-5" />
      <div className="space-y-4 rounded-card bg-surface p-6 sm:p-7 xl:col-span-7">
        <Bone className="h-6 w-40 rounded-xl" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="h-7 w-10" />
            <Bone className="h-4 flex-1" />
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-card bg-surface p-6 sm:p-7 xl:col-span-5">
        <Bone className="h-6 w-44 rounded-xl" />
        <Bone className="h-32 w-full rounded-panel" />
      </div>
    </Loading>
  );
}

/** Esqueleto del encabezado del paciente + pestañas + contenido. */
export function PatientDetailSkeleton() {
  return (
    <Loading label="Cargando paciente…" className="flex flex-col gap-6">
      <Bone className="h-9 w-28 bg-surface" />
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-center gap-5">
          <Bone className="size-16 shrink-0 bg-line-strong/60 sm:size-20" />
          <div className="space-y-3">
            <Bone className="h-7 w-32 bg-surface" />
            <Bone className="h-10 w-64 rounded-2xl bg-line-strong/70 sm:h-12 sm:w-80" />
            <Bone className="h-4 w-72 max-w-full bg-line-strong/60" />
          </div>
        </div>
        <div className="flex gap-2">
          <Bone className="h-11 w-40 bg-surface" />
          <Bone className="h-11 w-40 bg-line-strong/70" />
          <Bone className="size-11 bg-surface" />
        </div>
      </div>
      <Bone className="h-12 w-full max-w-[760px] bg-surface" />
      <PatientTabSkeleton />
    </Loading>
  );
}

/** Esqueleto del formulario de paciente. */
export function PatientFormSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Loading label="Cargando formulario…" className="flex flex-col gap-6">
      {compact ? (
        <div className="space-y-3">
          <Bone className="h-9 w-80 max-w-full rounded-2xl bg-line-strong/70" />
          <Bone className="h-4 w-96 max-w-full bg-line-strong/60" />
        </div>
      ) : (
        <div className="space-y-3">
          <Bone className="h-4 w-40 bg-line-strong/70" />
          <Bone className="h-12 w-72 rounded-2xl bg-line-strong/70" />
          <Bone className="h-12 w-96 max-w-full rounded-2xl bg-line-strong/70" />
        </div>
      )}
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-5 rounded-card bg-surface p-6 sm:p-8">
          <Bone className="h-6 w-48 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, j) => (
              <div key={j} className="space-y-2">
                <Bone className="h-3.5 w-24" />
                <Bone className="h-12 w-full rounded-field" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Loading>
  );
}
