import type { ReactNode } from "react";
import { MobileNav } from "@/components/shell/mobile-nav";
import { SidebarContent, type ShellProfessional, type ShellRecentPatient } from "@/components/shell/sidebar";

/** Id del contenido principal (destino del enlace "Saltar al contenido"). */
export const MAIN_CONTENT_ID = "contenido";

/**
 * Layout principal: barra lateral blanca flotante (desktop) + contenido.
 * En mobile, barra superior con menú tipo hoja.
 */
export function AppShell({
  professional,
  recentPatients,
  activeCount,
  children,
}: {
  professional: ShellProfessional;
  recentPatients: ShellRecentPatient[];
  activeCount: number;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-float focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus-visible:outline-white print:hidden"
      >
        Saltar al contenido
      </a>

      <MobileNav professional={professional} recentPatients={recentPatients} activeCount={activeCount} />

      <aside aria-label="Barra lateral" className="fixed inset-y-0 left-0 z-20 hidden w-[316px] p-5 lg:block print:hidden">
        {/* Barra fina visible: indica que hay más contenido abajo en pantallas bajas. */}
        <div className="scrollbar-thin h-full overflow-y-auto overscroll-contain rounded-card bg-surface px-4 pt-6">
          <SidebarContent professional={professional} recentPatients={recentPatients} activeCount={activeCount} />
        </div>
      </aside>

      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="outline-none lg:pl-[316px] print:pl-0">
        <div className="mx-auto w-full max-w-[1240px] px-4 pt-4 pb-16 sm:px-6 lg:px-8 lg:pt-10 print:max-w-none print:p-0">
          {children}
        </div>
      </main>
    </div>
  );
}
