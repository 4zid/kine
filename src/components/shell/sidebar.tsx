"use client";

import { LogOut, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SectionLabel } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { PainBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { GENERAL_NAV, MAIN_NAV } from "@/components/shell/nav-config";
import { signOut } from "@/lib/actions/session";
import { cn, formatRelativeDay, fullName } from "@/lib/utils";

export type ShellProfessional = {
  first_name: string;
  last_name: string;
  license_number: string | null;
  license_type: string | null;
};

export type ShellRecentPatient = {
  id: string;
  first_name: string;
  last_name: string;
  last_session_date: string | null;
  max_pain: number | null;
};

type SidebarProps = {
  professional: ShellProfessional;
  recentPatients: ShellRecentPatient[];
  activeCount: number;
  onNavigate?: () => void;
};

function NavItem({
  href,
  active,
  children,
  onNavigate,
  trailing,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  onNavigate?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-12 items-center gap-3 rounded-2xl px-3 text-[15px] transition-colors [&_svg]:size-5",
        active
          ? "bg-surface-2 font-medium text-ink before:absolute before:top-2 before:bottom-2 before:-left-4 before:w-[3px] before:rounded-r-full before:bg-brand"
          : "text-ink-2 hover:bg-surface-2/70",
      )}
    >
      {children}
      {trailing ? <span className="ml-auto">{trailing}</span> : null}
    </Link>
  );
}

/** Contenido de la barra lateral (se reutiliza en desktop y en el menú mobile). */
export function SidebarContent({ professional, recentPatients, activeCount, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const license = professional.license_number
    ? `${professional.license_type === "nacional" ? "MN" : professional.license_type === "provincial" ? "MP" : "Mat."} ${professional.license_number}`
    : null;

  return (
    <div className="flex h-full flex-col">
      <Link href="/inicio" onClick={onNavigate} className="mb-8 inline-flex px-2 pt-1" aria-label="kine — inicio">
        <Logo />
      </Link>

      <SectionLabel className="mb-2">Menú</SectionLabel>
      <nav className="flex flex-col gap-1" aria-label="Principal">
        {MAIN_NAV.map(({ href, label, icon: Icon }) => (
          <NavItem
            key={href}
            href={href}
            active={isActive(href) && !(href === "/pacientes" && pathname === "/pacientes/nuevo")}
            onNavigate={onNavigate}
            trailing={
              href === "/pacientes" && activeCount > 0 ? (
                <span className="tabular inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-2 text-xs font-semibold text-white">
                  {activeCount}
                </span>
              ) : null
            }
          >
            <Icon strokeWidth={1.6} />
            {label}
          </NavItem>
        ))}
      </nav>

      {recentPatients.length > 0 ? (
        <>
          <SectionLabel className="mt-8 mb-2">Recientes</SectionLabel>
          <div className="flex flex-col gap-1">
            {recentPatients.map((p) => {
              const href = `/pacientes/${p.id}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={p.id}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
                    active
                      ? "bg-surface-2 before:absolute before:top-2 before:bottom-2 before:-left-4 before:w-[3px] before:rounded-r-full before:bg-brand"
                      : "hover:bg-surface-2/70",
                  )}
                >
                  <Avatar person={p} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[15px]", active ? "font-medium text-ink" : "text-ink-2")}>
                      {fullName(p)}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {p.last_session_date ? `Última sesión ${formatRelativeDay(p.last_session_date)}` : "Sin sesiones aún"}
                    </span>
                  </span>
                  {p.max_pain != null ? <PainBadge intensity={p.max_pain} size="sm" /> : null}
                </Link>
              );
            })}
          </div>
        </>
      ) : null}

      <SectionLabel className="mt-8 mb-2">General</SectionLabel>
      <nav className="flex flex-col gap-1" aria-label="General">
        {GENERAL_NAV.map(({ href, label, icon: Icon }) => (
          <NavItem key={href} href={href} active={isActive(href)} onNavigate={onNavigate}>
            <Icon strokeWidth={1.6} />
            {label}
          </NavItem>
        ))}
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-[15px] text-ink-2 transition-colors hover:bg-surface-2/70 [&_svg]:size-5"
          >
            <LogOut strokeWidth={1.6} />
            Cerrar sesión
          </button>
        </form>
      </nav>

      <div className="mt-auto pt-8">
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-brand-800 via-brand-700 to-brand p-5 text-white">
          <svg aria-hidden viewBox="0 0 200 160" className="pointer-events-none absolute inset-0 h-full w-full text-white" fill="none" stroke="currentColor">
            <circle cx="190" cy="-10" r="90" strokeOpacity="0.14" />
            <circle cx="-20" cy="170" r="80" strokeOpacity="0.12" />
          </svg>
          <div className="relative">
            <span className="mb-4 inline-flex size-10 items-center justify-center rounded-full bg-white text-brand">
              <UserRound className="size-5" strokeWidth={1.8} />
            </span>
            <p className="display text-xl leading-tight">
              Lic. {professional.first_name || "Kinesiólogo/a"} {professional.last_name}
            </p>
            <p className="mt-1.5 text-sm text-white/70">
              {activeCount === 1 ? "1 paciente en tratamiento" : `${activeCount} pacientes en tratamiento`}
              {license ? ` · ${license}` : ""}
            </p>
            <ButtonLink
              href="/pacientes/nuevo"
              onClick={onNavigate}
              variant="brand"
              className="mt-5 w-full bg-white/12 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] hover:bg-white/20"
              icon={<Plus />}
            >
              Nuevo paciente
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
