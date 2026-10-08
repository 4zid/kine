import { House, Settings, Users } from "lucide-react";

export const MAIN_NAV = [
  { href: "/inicio", label: "Inicio", icon: House },
  { href: "/pacientes", label: "Pacientes", icon: Users },
] as const;

export const GENERAL_NAV = [{ href: "/ajustes", label: "Ajustes", icon: Settings }] as const;
