"use client";

import { UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SPECIALTIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PROFESSIONAL_LIMITS as L, type SettingsProfessional } from "@/components/settings/limits";
import { SaveFooter, SettingsSection } from "@/components/settings/settings-section";
import { useSettingsForm, type FormAction } from "@/components/settings/use-settings-form";

function licenseLabel(p: Pick<SettingsProfessional, "license_number" | "license_type">) {
  if (!p.license_number) return null;
  const short = p.license_type === "nacional" ? "MN" : p.license_type === "provincial" ? "MP" : "Mat.";
  return `${short} ${p.license_number}`;
}

export function ProfileForm({ professional, action }: { professional: SettingsProfessional; action: FormAction }) {
  const initial = {
    first_name: professional.first_name ?? "",
    last_name: professional.last_name ?? "",
    phone: professional.phone ?? "",
    bio: professional.bio ?? "",
  };
  const { values, set, errors, formAction, pending, dirty, discard } = useSettingsForm(initial, action);

  const displayName = [values.first_name.trim(), values.last_name.trim()].filter(Boolean).join(" ");
  const specialtyLabels = professional.specialties
    .map((s) => SPECIALTIES.find((o) => o.value === s)?.label)
    .filter(Boolean)
    .slice(0, 2);
  const license = licenseLabel(professional);

  return (
    <form action={formAction} noValidate>
      <SettingsSection
        id="perfil"
        icon={<UserRound strokeWidth={1.7} />}
        title="Perfil"
        description="Tus datos personales y cómo te presentás en los informes."
        footer={
          <SaveFooter dirty={dirty} pending={pending} onDiscard={discard} hint="Se usan en tus informes y en la barra lateral." />
        }
      >
        <div className="mb-7 flex items-center gap-4 rounded-panel bg-surface-2 p-4 sm:p-5">
          <Avatar person={{ id: "me", first_name: values.first_name, last_name: values.last_name }} size="lg" />
          <div className="min-w-0">
            <p className="display truncate text-[22px] font-medium text-ink">Lic. {displayName || "Tu nombre"}</p>
            <p className="mt-0.5 truncate text-sm text-muted">
              {[license, ...specialtyLabels].filter(Boolean).join(" · ") || "Completá tus datos profesionales"}
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="first_name" error={errors.first_name}>
            <Input
              id="first_name"
              name="first_name"
              autoComplete="given-name"
              required
              maxLength={L.first_name}
              value={values.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              aria-invalid={Boolean(errors.first_name) || undefined}
            />
          </Field>
          <Field label="Apellido" htmlFor="last_name" error={errors.last_name}>
            <Input
              id="last_name"
              name="last_name"
              autoComplete="family-name"
              required
              maxLength={L.last_name}
              value={values.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              aria-invalid={Boolean(errors.last_name) || undefined}
            />
          </Field>
          <Field label="Teléfono" htmlFor="phone" optional error={errors.phone} hint="Con código de área. Ej.: 11 5555-1234">
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={L.phone}
              placeholder="+54 11 5555-1234"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              aria-invalid={Boolean(errors.phone) || undefined}
            />
          </Field>
          <Field
            label="Sobre vos"
            htmlFor="bio"
            optional
            error={errors.bio}
            className="sm:col-span-2"
            hint={
              <span className="flex justify-between gap-3">
                <span>Formación, enfoque de trabajo, idiomas…</span>
                <span className={cn("tabular shrink-0", values.bio.length > L.bio * 0.9 && "text-warning")}>
                  {values.bio.length}/{L.bio}
                </span>
              </span>
            }
          >
            <Textarea
              id="bio"
              name="bio"
              rows={4}
              maxLength={L.bio}
              placeholder="Ej.: Kinesióloga (UBA) con posgrado en kinesiología deportiva. Trabajo con terapia manual y ejercicio terapéutico."
              value={values.bio}
              onChange={(e) => set("bio", e.target.value)}
              aria-invalid={Boolean(errors.bio) || undefined}
            />
          </Field>
        </div>
      </SettingsSection>
    </form>
  );
}
