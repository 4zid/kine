"use client";

import { LogOut, Plus, Search, UserRound } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, type ReactNode } from "react";
import { SectionLabel } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { PainBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { GENERAL_NAV, MAIN_NAV } from "@/components/shell/nav-config";
import { signOut } from "@/lib/actions/session";
import { cn, fullName } from "@/lib/utils";

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
  /** Texto calculado en el servidor: "Última sesión hace 3 días" / "Sin sesiones aún". */
  activityLabel: string;
  /** Dolor máximo actual del mapa corporal (zonas activas con intensidad > 0). */
  max_pain: number | null;
  /** Antigüedad de ese dato, p. ej. "actualizado hace 3 días" (calculado en el servidor). */
  painUpdatedLabel: string | null;
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

/** Búsqueda global de pacientes: lleva al listado filtrado (todos los estados). */
function PatientSearch({ onNavigate }: { onNavigate?: () => void }) {
  const id = useId();
  return (
    <Form action="/pacientes" role="search" aria-label="Buscar pacientes" className="mb-6" onSubmit={() => onNavigate?.()}>
      <label htmlFor={id} className="sr-only">
        Buscar paciente
      </label>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted" strokeWidth={1.8} />
        <input
          id={id}
          name="q"
          type="search"
          required
          maxLength={80}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Buscar paciente"
          className="h-11 w-full rounded-full bg-surface-2 pr-4 pl-10 text-base text-ink outline-none placeholder:text-subtle transition-[background-color,box-shadow] hover:bg-surface-3/70 focus:bg-surface focus:shadow-[0_0_0_1.5px_var(--color-ink)] sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
        />
        <input type="hidden" name="estado" value="todos" />
      </div>
    </Form>
  );
}

function licenseLabel(p: ShellProfessional): string | null {
  if (!p.license_number) return null;
  const prefix = p.license_type === "nacional" ? "MN" : p.license_type === "provincial" ? "MP" : "Mat.";
  return `${prefix} ${p.license_number}`;
}

/** Contenido de la barra lateral (se reutiliza en desktop y en el menú mobile). */
export function SidebarContent({ professional, recentPatients, activeCount, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const license = licenseLabel(professional);
  const name = [professional.first_name, professional.last_name].filter(Boolean).join(" ").trim();
  const recentId = useId();

  return (
    <div className="flex min-h-full flex-col">
      <Link href="/inicio" onClick={onNavigate} className="mb-6 inline-flex self-start px-2 pt-1" aria-label="kine — inicio">
        <Logo />
      </Link>

      <PatientSearch onNavigate={onNavigate} />

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
                  <span className="sr-only"> en tratamiento</span>
                </span>
              ) : null
            }
          >
            <Icon strokeWidth={1.6} aria-hidden />
            {label}
          </NavItem>
        ))}
      </nav>

      {recentPatients.length > 0 ? (
        <>
          <SectionLabel id={recentId} className="mt-8 mb-2 [@media(max-height:940px)]:mt-6">
            Recientes
          </SectionLabel>
          <ul className="flex flex-col gap-1" aria-labelledby={recentId}>
            {recentPatients.map((p) => {
              const href = `/pacientes/${p.id}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={p.id}>
                  <Link
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
                      <span className="block truncate text-xs text-muted">{p.activityLabel}</span>
                    </span>
                    {p.max_pain != null ? (
                      <PainBadge intensity={p.max_pain} size="sm" context="por zona (mapa)" updatedLabel={p.painUpdatedLabel ?? undefined} />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      <SectionLabel className="mt-8 mb-2 [@media(max-height:940px)]:mt-6">General</SectionLabel>
      <nav className="flex flex-col gap-1" aria-label="General">
        {GENERAL_NAV.map(({ href, label, icon: Icon }) => (
          <NavItem key={href} href={href} active={isActive(href)} onNavigate={onNavigate}>
            <Icon strokeWidth={1.6} aria-hidden />
            {label}
          </NavItem>
        ))}
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-[15px] text-ink-2 transition-colors hover:bg-surface-2/70 [&_svg]:size-5"
          >
            <LogOut strokeWidth={1.6} aria-hidden />
            Cerrar sesión
          </button>
        </form>
      </nav>

      {/*
        Tarjeta del profesional. En la barra lateral de escritorio queda fija abajo (sticky) para que
        nunca quede cortada; en pantallas bajas (≤ 940px de alto) se compacta y lo de arriba se desplaza
        por debajo, con un degradé que indica que hay más contenido. En el menú mobile va al final.
      */}
      <div className="mt-auto bg-surface pt-6 pb-4 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:hidden before:h-8 before:bg-gradient-to-t before:from-surface before:to-transparent lg:sticky lg:bottom-0 lg:z-10 lg:before:block [@media(max-height:940px)]:pt-3">
        <div
          data-surface="dark"
          className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-brand-800 via-brand-700 to-brand p-5 text-white [@media(max-height:940px)]:p-4"
        >
          <svg aria-hidden viewBox="0 0 200 160" className="pointer-events-none absolute inset-0 h-full w-full text-white" fill="none" stroke="currentColor">
            <circle cx="190" cy="-10" r="90" strokeOpacity="0.14" />
            <circle cx="-20" cy="170" r="80" strokeOpacity="0.12" />
          </svg>
          <div className="relative">
            <span className="mb-4 inline-flex size-10 items-center justify-center rounded-full bg-white text-brand [@media(max-height:940px)]:hidden">
              <UserRound className="size-5" strokeWidth={1.8} aria-hidden />
            </span>
            <p className="display text-xl leading-tight [@media(max-height:940px)]:text-lg">{name ? `Lic. ${name}` : "Tu perfil profesional"}</p>
            <p className="mt-1.5 text-sm text-white/80 [@media(max-height:940px)]:mt-1 [@media(max-height:940px)]:text-[13px]">
              {activeCount === 1 ? "1 paciente en tratamiento" : `${activeCount} pacientes en tratamiento`}
              {license ? (
                <>
                  {" · "}
                  <span className="whitespace-nowrap">{license}</span>
                </>
              ) : null}
            </p>
            <ButtonLink
              href="/pacientes/nuevo"
              onClick={onNavigate}
              variant="brand"
              className="mt-5 w-full bg-white/12 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] hover:bg-white/20 focus-visible:outline-white [@media(max-height:940px)]:mt-3 [@media(max-height:940px)]:h-10"
              icon={<Plus aria-hidden />}
            >
              Nuevo paciente
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
