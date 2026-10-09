"use client";

import { BadgeCheck } from "lucide-react";
import { ChipGroup } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented";
import { DOT_COLORS, SPECIALTIES } from "@/lib/constants";
import type { LicenseType } from "@/lib/types";
import { PROFESSIONAL_LIMITS as L, type SettingsProfessional } from "@/components/settings/limits";
import { ProvinceSelect } from "@/components/settings/province-select";
import { SaveFooter, SettingsSection } from "@/components/settings/settings-section";
import { useSettingsForm, type FormAction } from "@/components/settings/use-settings-form";

const LICENSE_OPTIONS: { value: LicenseType; label: string }[] = [
  { value: "nacional", label: "Nacional · MN" },
  { value: "provincial", label: "Provincial · MP" },
];

const SPECIALTY_OPTIONS = SPECIALTIES.map((s, i) => ({ ...s, dot: DOT_COLORS[i % DOT_COLORS.length] }));

function asLicenseType(value: string | null): LicenseType | "" {
  return value === "nacional" || value === "provincial" ? value : "";
}

export function ProfessionalForm({ professional, action }: { professional: SettingsProfessional; action: FormAction }) {
  const initial = {
    license_number: professional.license_number ?? "",
    license_type: asLicenseType(professional.license_type),
    license_province: professional.license_province ?? "",
    specialties: professional.specialties ?? [],
  };
  const { values, set, errors, onSubmit, pending, dirty, discard } = useSettingsForm(initial, action);
  const count = values.specialties.length;

  return (
    <form onSubmit={onSubmit} noValidate>
      <SettingsSection
        id="datos-profesionales"
        icon={<BadgeCheck strokeWidth={1.7} />}
        title="Datos profesionales"
        description="Matrícula y especialidades. Aparecen en el encabezado de tus informes."
        footer={
          <SaveFooter dirty={dirty} pending={pending} onDiscard={discard} hint="Verificá que coincidan con tu matrícula vigente." />
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Número de matrícula" htmlFor="license_number" error={errors.license_number}>
            <Input
              id="license_number"
              name="license_number"
              inputMode="text"
              autoComplete="off"
              maxLength={L.license_number}
              placeholder="Ej.: 12345"
              value={values.license_number}
              onChange={(e) => set("license_number", e.target.value)}
              aria-invalid={Boolean(errors.license_number) || undefined}
            />
          </Field>

          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-2">Tipo de matrícula</span>
            <SegmentedControl<LicenseType | "">
              aria-label="Tipo de matrícula"
              options={LICENSE_OPTIONS}
              value={values.license_type}
              onChange={(v) => set("license_type", v)}
              className="h-12 w-full [&>button]:h-10 [&>button]:flex-1 [&>button]:justify-center"
            />
            <input type="hidden" name="license_type" value={values.license_type} />
            {errors.license_type ? (
              <p role="alert" className="text-[13px] text-danger">
                {errors.license_type}
              </p>
            ) : null}
          </div>

          <Field
            label="Provincia de la matrícula"
            htmlFor="license_province"
            optional
            error={errors.license_province}
            className="sm:col-span-2"
            hint={values.license_type === "nacional" ? "Para matrícula nacional podés dejarla vacía." : undefined}
          >
            <ProvinceSelect
              id="license_province"
              name="license_province"
              value={values.license_province}
              onChange={(e) => set("license_province", e.target.value)}
              aria-invalid={Boolean(errors.license_province) || undefined}
            />
          </Field>
        </div>

        <div className="mt-7 border-t border-line pt-6">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-medium text-ink-2">Especialidades</span>
            <span className="text-[13px] text-muted" aria-live="polite">
              {count === 0 ? "Elegí al menos una" : count === 1 ? "1 seleccionada" : `${count} seleccionadas`}
            </span>
          </div>
          <ChipGroup
            aria-label="Especialidades"
            multiple
            name="specialties"
            options={SPECIALTY_OPTIONS}
            value={values.specialties}
            onChange={(v) => set("specialties", v)}
          />
          {errors.specialties ? (
            <p role="alert" className="mt-2 text-[13px] text-danger">
              {errors.specialties}
            </p>
          ) : null}
        </div>
      </SettingsSection>
    </form>
  );
}
