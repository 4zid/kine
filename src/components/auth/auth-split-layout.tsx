import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { DarkPanel, type PanelTone } from "@/components/onboarding/dark-panel";
import { MOTION_ROOT_CLASS, MotionKeyframes } from "@/components/onboarding/motion";
import { cn } from "@/lib/utils";

/**
 * Layout dividido de las pantallas de acceso: panel oscuro ilustrado a la izquierda
 * (solo desktop) y tarjeta blanca con el formulario a la derecha.
 */
export function AuthSplitLayout({
  aside,
  topRight,
  children,
  width = "md",
}: {
  aside: ReactNode;
  /** Link secundario arriba a la derecha (p. ej. "¿No tenés cuenta? Creá una"). */
  topRight?: ReactNode;
  children: ReactNode;
  width?: "md" | "lg";
}) {
  return (
    <div className={cn(MOTION_ROOT_CLASS, "flex min-h-dvh gap-4 overflow-x-clip p-2 sm:p-3 lg:p-4")}>
      <MotionKeyframes />
      <aside className="hidden w-[44%] max-w-[700px] shrink-0 lg:block">
        <div className="sticky top-4 h-[calc(100dvh-2rem)] min-h-[620px]">{aside}</div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col rounded-[24px] bg-surface px-5 pt-4 pb-5 sm:rounded-card sm:px-10 sm:pt-7 sm:pb-7 lg:px-12 xl:px-16">
        <header className="flex min-h-11 items-center justify-between gap-4">
          <Link href="/bienvenida" aria-label="kine · conocé la plataforma" className="rounded-full lg:hidden">
            <Logo />
          </Link>
          {topRight ? <div className="ml-auto text-right text-sm text-muted">{topRight}</div> : null}
        </header>

        <div className="flex flex-1 flex-col justify-center py-8 sm:py-12">
          <div className={cn("mx-auto w-full", width === "lg" ? "max-w-[540px]" : "max-w-[440px]")}>{children}</div>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-subtle lg:justify-start">
          <span>kine · Registro clínico para kinesiólogos</span>
          <span aria-hidden className="hidden sm:inline">
            ·
          </span>
          <span>Datos de salud confidenciales</span>
        </footer>
      </main>
    </div>
  );
}

/** Link de texto para la esquina superior derecha. */
export function TopLink({ prompt, href, children }: { prompt: string; href: string; children: ReactNode }) {
  return (
    <>
      <span className="hidden sm:inline">{prompt} </span>
      <Link href={href} className="inline-flex h-10 items-center font-medium text-ink underline-offset-4 hover:underline">
        {children}
      </Link>
    </>
  );
}

/** Encabezado de pantalla de acceso: eyebrow + título en dos líneas (liviana / semibold). */
export function AuthHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: ReactNode;
  title: [ReactNode, ReactNode];
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow ? <p className="text-[15px] text-muted [&_strong]:font-medium [&_strong]:text-ink">{eyebrow}</p> : null}
      <h1 className={cn("display text-[34px] text-ink sm:text-[42px]", eyebrow && "mt-3")}>
        <span className="block font-normal">{title[0]}</span>
        <span className="block font-semibold">{title[1]}</span>
      </h1>
      {description ? <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-base">{description}</p> : null}
    </div>
  );
}

/** Panel oscuro de la izquierda: logo, ilustración y mensaje. */
export function AuthAside({
  tone = "green",
  title,
  description,
  children,
  footer,
}: {
  tone?: PanelTone;
  title: [ReactNode, ReactNode];
  description?: ReactNode;
  /** Ilustración (tarjetas flotantes). */
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <DarkPanel tone={tone} className="flex h-full flex-col rounded-card">
      <div className="relative z-10 p-8">
        <Link href="/bienvenida" aria-label="kine · conocé la plataforma" className="inline-flex rounded-full">
          <Logo inverted />
        </Link>
      </div>
      <div inert aria-hidden className="relative flex min-h-0 flex-1 items-center justify-center px-8 select-none">
        <div className="flex w-full origin-center justify-center [@media(max-height:820px)]:scale-[0.86] [@media(max-height:720px)]:scale-[0.74]">
          {children}
        </div>
      </div>
      <div className="relative z-10 p-8 xl:p-10">
        <h2 className="display text-[34px] text-white xl:text-[40px]">
          <span className="block font-normal">{title[0]}</span>
          <span className="block font-semibold">{title[1]}</span>
        </h2>
        {description ? <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/65">{description}</p> : null}
        {footer}
      </div>
    </DarkPanel>
  );
}
