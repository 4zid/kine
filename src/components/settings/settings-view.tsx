import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { cn, fullName } from "@/lib/utils";
import { AccountCard } from "@/components/settings/account-card";
import { ClinicForm } from "@/components/settings/clinic-form";
import type { SettingsProfessional } from "@/components/settings/limits";
import { ProfessionalForm } from "@/components/settings/professional-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { SectionNav } from "@/components/settings/section-nav";
import type { FormAction } from "@/components/settings/use-settings-form";

export type SettingsActions = {
  updateProfile: FormAction;
  updateProfessionalData: FormAction;
  updateClinic: FormAction;
  changePassword: FormAction;
};

/** Qué tan completo está el perfil (para el indicador de la columna izquierda). */
export function profileCompleteness(p: SettingsProfessional) {
  const checks = [
    Boolean(p.first_name?.trim() && p.last_name?.trim()),
    Boolean(p.phone),
    Boolean(p.license_number && p.license_type),
    p.specialties.length > 0,
    Boolean(p.clinic_name || p.clinic_address),
    Boolean(p.city && p.province),
  ];
  return { done: checks.filter(Boolean).length, total: checks.length, checks };
}

function ProfileMiniCard({ professional }: { professional: SettingsProfessional }) {
  const { done, total, checks } = profileCompleteness(professional);
  const pct = Math.round((done / total) * 100);
  return (
    <div className="rounded-card bg-surface p-5">
      <div className="flex items-center gap-3">
        <Avatar person={{ id: "me", first_name: professional.first_name, last_name: professional.last_name }} size="md" />
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{fullName(professional)}</p>
          <p className="truncate text-[13px] text-muted">{professional.email}</p>
        </div>
      </div>
      <div className="mt-5 flex items-baseline justify-between">
        <p className="text-[13px] text-muted">Perfil completo</p>
        <p className="display tabular text-xl text-ink">
          {pct}
          <span className="text-sm text-muted">%</span>
        </p>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {checks.map((ok, i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", ok ? "bg-ink" : "bg-surface-3")} />
        ))}
      </div>
    </div>
  );
}

/** Pantalla de ajustes: índice de secciones + formularios por sección. */
export function SettingsView({ professional, actions }: { professional: SettingsProfessional; actions: SettingsActions }) {
  const name = fullName(professional);
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        className="animate-fade-up"
        eyebrow={
          <>
            Tu cuenta · <strong>{name === "Sin nombre" ? "Kinesiólogo/a" : `Lic. ${name}`}</strong>
          </>
        }
        title="Ajustes"
      />

      <div className="grid gap-8 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-10">
        <aside className="hidden xl:block">
          <div className="sticky top-8 flex flex-col gap-5">
            <ProfileMiniCard professional={professional} />
            <SectionNav variant="rail" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
          <SectionNav variant="pills" className="-mb-2 xl:hidden" />
          <div className="animate-fade-up">
            <ProfileForm professional={professional} action={actions.updateProfile} />
          </div>
          <div className="animate-fade-up [animation-delay:60ms]">
            <ProfessionalForm professional={professional} action={actions.updateProfessionalData} />
          </div>
          <div className="animate-fade-up [animation-delay:120ms]">
            <ClinicForm professional={professional} action={actions.updateClinic} />
          </div>
          <div className="animate-fade-up [animation-delay:180ms]">
            <AccountCard email={professional.email} changePasswordAction={actions.changePassword} />
          </div>
        </div>
      </div>
    </div>
  );
}
