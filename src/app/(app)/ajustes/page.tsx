import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/settings-view";
import { requireProfessional } from "@/lib/auth";
import { changePassword, updateClinic, updateProfessionalData, updateProfile } from "./actions";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const professional = await requireProfessional();

  return (
    <SettingsView
      professional={{
        email: professional.email,
        first_name: professional.first_name,
        last_name: professional.last_name,
        phone: professional.phone,
        bio: professional.bio,
        license_number: professional.license_number,
        license_type: professional.license_type,
        license_province: professional.license_province,
        specialties: professional.specialties,
        clinic_name: professional.clinic_name,
        clinic_address: professional.clinic_address,
        city: professional.city,
        province: professional.province,
      }}
      actions={{ updateProfile, updateProfessionalData, updateClinic, changePassword }}
    />
  );
}
