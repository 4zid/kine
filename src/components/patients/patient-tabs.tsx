"use client";

import { CalendarCheck, ClipboardList, FolderOpen, LayoutDashboard, PersonStanding, Printer } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { TabsNav, type TabItem } from "@/components/ui/tabs-nav";
import { usePatientRoute } from "@/components/patients/patient-route";

/** Pestañas del paciente. Las rutas de cada pestaña las implementan sus módulos. */
export function patientTabItems(patientId: string): TabItem[] {
  const base = `/pacientes/${patientId}`;
  return [
    { href: base, label: "Resumen", icon: <LayoutDashboard strokeWidth={1.8} />, exact: true },
    { href: `${base}/historia`, label: "Historia clínica", icon: <ClipboardList strokeWidth={1.8} /> },
    { href: `${base}/mapa`, label: "Mapa corporal", icon: <PersonStanding strokeWidth={1.8} /> },
    { href: `${base}/sesiones`, label: "Sesiones", icon: <CalendarCheck strokeWidth={1.8} /> },
    { href: `${base}/estudios`, label: "Estudios", icon: <FolderOpen strokeWidth={1.8} /> },
    { href: `${base}/informe`, label: "Informe", icon: <Printer strokeWidth={1.8} /> },
  ];
}

/**
 * Pestañas del paciente.
 * - Si la tira desborda (mobile, o 1024–1279 px con la barra lateral), lleva la pestaña activa
 *   a la vista: con un deep link a Sesiones/Estudios/Informe la píldora activa quedaba fuera.
 * - Entre lg y xl oculta los íconos para que entren las seis pestañas.
 * - En "Editar datos" no se muestran: ninguna pestaña corresponde y el formulario tiene su
 *   propio "Cancelar".
 */
export function PatientTabs({ patientId }: { patientId: string }) {
  const pathname = usePathname();
  const { isEdit } = usePatientRoute(patientId);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav = rootRef.current?.querySelector<HTMLElement>("nav");
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    const navBox = nav.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    // Ya visible completa (p. ej. si TabsNav ya la centró): no mover nada.
    if (box.left >= navBox.left && box.right <= navBox.right) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    nav.scrollTo({
      left: nav.scrollLeft + (box.left - navBox.left) - (navBox.width - box.width) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [pathname]);

  if (isEdit) return null;

  return (
    <div ref={rootRef} className="print:hidden">
      <TabsNav items={patientTabItems(patientId)} className="lg:max-xl:[&_svg]:hidden" />
    </div>
  );
}
