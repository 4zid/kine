"use client";

import { Menu, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Logo } from "@/components/ui/logo";
import { SidebarContent, type ShellProfessional, type ShellRecentPatient } from "@/components/shell/sidebar";

export function MobileNav(props: {
  professional: ShellProfessional;
  recentPatients: ShellRecentPatient[];
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 bg-canvas/85 px-4 backdrop-blur-md lg:hidden print:hidden">
        <Link href="/inicio" aria-label="kine — inicio">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ButtonLink href="/pacientes/nuevo" size="icon" variant="primary" aria-label="Nuevo paciente">
            <Plus aria-hidden />
          </ButtonLink>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="inline-flex size-11 items-center justify-center rounded-full bg-surface text-ink shadow-inset"
          >
            <Menu className="size-5" aria-hidden />
          </button>
        </div>
      </header>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        variant="sheet"
        size="sm"
        aria-label="Menú"
        className="sm:max-w-sm"
      >
        <div className="pb-4 pl-4">
          <SidebarContent {...props} onNavigate={() => setOpen(false)} />
        </div>
      </Dialog>
    </>
  );
}
