"use client";

import { Building } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { PROFESSIONAL_LIMITS as L, type SettingsProfessional } from "@/components/settings/limits";
import { ProvinceSelect } from "@/components/settings/province-select";
import { SaveFooter, SettingsSection } from "@/components/settings/settings-section";
import { useSettingsForm, type FormAction } from "@/components/settings/use-settings-form";

export function ClinicForm({ professional, action }: { professional: SettingsProfessional; action: FormAction }) {
  const initial = {
    clinic_name: professional.clinic_name ?? "",
    clinic_address: professional.clinic_address ?? "",
    city: professional.city ?? "",
    province: professional.province ?? "",
  };
  const { values, set, errors, onSubmit, pending, dirty, discard } = useSettingsForm(initial, action);

  return (
    <form onSubmit={onSubmit} noValidate>
      <SettingsSection
        id="consultorio"
        icon={<Building strokeWidth={1.7} />}
        title="Consultorio"
        description="Dónde atendés. Se imprime al pie de los informes."
        footer={<SaveFooter dirty={dirty} pending={pending} onDiscard={discard} hint="Si atendés a domicilio, podés dejarlo vacío." />}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre del consultorio" htmlFor="clinic_name" optional error={errors.clinic_name} className="sm:col-span-2">
            <Input
              id="clinic_name"
              name="clinic_name"
              autoComplete="organization"
              maxLength={L.clinic_name}
              placeholder="Ej.: Kinesiología Palermo"
              value={values.clinic_name}
              onChange={(e) => set("clinic_name", e.target.value)}
              aria-invalid={Boolean(errors.clinic_name) || undefined}
            />
          </Field>
          <Field label="Dirección" htmlFor="clinic_address" optional error={errors.clinic_address} className="sm:col-span-2">
            <Input
              id="clinic_address"
              name="clinic_address"
              autoComplete="street-address"
              maxLength={L.clinic_address}
              placeholder="Calle, número, piso y depto."
              value={values.clinic_address}
              onChange={(e) => set("clinic_address", e.target.value)}
              aria-invalid={Boolean(errors.clinic_address) || undefined}
            />
          </Field>
          <Field label="Ciudad" htmlFor="city" optional error={errors.city}>
            <Input
              id="city"
              name="city"
              autoComplete="address-level2"
              maxLength={L.city}
              placeholder="Ej.: Rosario"
              value={values.city}
              onChange={(e) => set("city", e.target.value)}
              aria-invalid={Boolean(errors.city) || undefined}
            />
          </Field>
          <Field label="Provincia" htmlFor="province" optional error={errors.province}>
            <ProvinceSelect
              id="province"
              name="province"
              autoComplete="address-level1"
              value={values.province}
              onChange={(e) => set("province", e.target.value)}
              aria-invalid={Boolean(errors.province) || undefined}
            />
          </Field>
        </div>
      </SettingsSection>
    </form>
  );
}
