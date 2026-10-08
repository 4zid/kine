import type { Professional } from "@/lib/types";

/** Largos máximos (espejan los CHECK de public.professionals). */
export const PROFESSIONAL_LIMITS = {
  first_name: 100,
  last_name: 100,
  phone: 50,
  bio: 2000,
  license_number: 50,
  license_province: 100,
  clinic_name: 150,
  clinic_address: 250,
  city: 100,
  province: 100,
} as const;

export const PASSWORD_MIN = 8;
/** Límite práctico de bcrypt (Supabase Auth). */
export const PASSWORD_MAX = 72;

/** Datos del profesional que usa la pantalla de ajustes. */
export type SettingsProfessional = Pick<
  Professional,
  | "email"
  | "first_name"
  | "last_name"
  | "phone"
  | "bio"
  | "license_number"
  | "license_type"
  | "license_province"
  | "specialties"
  | "clinic_name"
  | "clinic_address"
  | "city"
  | "province"
>;

export const SETTINGS_SECTIONS = [
  { id: "perfil", label: "Perfil", short: "Perfil" },
  { id: "datos-profesionales", label: "Datos profesionales", short: "Profesional" },
  { id: "consultorio", label: "Consultorio", short: "Consultorio" },
  { id: "cuenta", label: "Cuenta", short: "Cuenta" },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];
