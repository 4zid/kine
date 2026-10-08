import { CalendarCheck, ClipboardList, FolderOpen, LayoutDashboard, PersonStanding, Printer } from "lucide-react";
import { TabsNav, type TabItem } from "@/components/ui/tabs-nav";

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

export function PatientTabs({ patientId }: { patientId: string }) {
  return <TabsNav items={patientTabItems(patientId)} className="print:hidden" />;
}
