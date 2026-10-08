import type { ReactNode } from "react";
import { MobileNav } from "@/components/shell/mobile-nav";
import { SidebarContent, type ShellProfessional, type ShellRecentPatient } from "@/components/shell/sidebar";

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
      <MobileNav professional={professional} recentPatients={recentPatients} activeCount={activeCount} />

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[316px] p-5 lg:block print:hidden">
        <div className="scrollbar-none h-full overflow-y-auto rounded-card bg-surface p-4 pt-6">
          <SidebarContent professional={professional} recentPatients={recentPatients} activeCount={activeCount} />
        </div>
      </aside>

      <main className="lg:pl-[316px] print:pl-0">
        <div className="mx-auto w-full max-w-[1240px] px-4 pt-4 pb-16 sm:px-6 lg:px-8 lg:pt-10 print:max-w-none print:p-0">
          {children}
        </div>
      </main>
    </div>
  );
}
