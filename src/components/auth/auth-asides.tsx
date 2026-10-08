import { Check, KeyRound, Lock, Mail, MapPin, ShieldCheck, UserRound } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { AuthAside } from "@/components/auth/auth-split-layout";
import { FloatingPill, MockCard, PainSummaryMockCard, PatientRowsMockCard } from "@/components/onboarding/mock-cards";
import { cardMotion } from "@/components/onboarding/motion";
import { DOT_COLORS, SPECIALTIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Piezas compartidas
// ---------------------------------------------------------------------------
function EmailPreviewMockCard({
  subject,
  body,
  cta,
  className,
  style,
}: {
  subject: string;
  body: string;
  cta: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <MockCard className={cn("p-0", className)} style={style}>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand text-white">
          <Mail className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium">{subject}</p>
          <p className="truncate text-[12px] text-muted">kine · ahora</p>
        </div>
      </div>
      <div className="px-5 pt-4 pb-5">
        <p className="text-[14px] leading-relaxed text-ink-2">{body}</p>
        <span className="mt-4 inline-flex h-10 items-center rounded-full bg-ink px-5 text-[13px] font-medium text-white">
          {cta}
        </span>
      </div>
    </MockCard>
  );
}

function ValueList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-6 space-y-2.5 [@media(max-height:860px)]:hidden">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-[15px] text-white/80">
          <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white/12 text-white">
            <Check className="size-3" strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TrustNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 flex items-start gap-2.5 border-t border-white/12 pt-5 text-[13px] leading-relaxed text-white/60">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-white/80" />
      <span>{children}</span>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Registro (vista previa en vivo del perfil)
// ---------------------------------------------------------------------------
export type ProfilePreview = {
  first_name: string;
  last_name: string;
  license_number: string;
  license_type: "nacional" | "provincial";
  license_province: string;
  specialties: string[];
  clinic_name: string;
  city: string;
  province: string;
};

function ProfilePreviewCard({ values }: { values: ProfilePreview }) {
  const name = [values.first_name.trim(), values.last_name.trim()].filter(Boolean).join(" ");
  const license = values.license_number.trim()
    ? `${values.license_type === "provincial" ? "MP" : "MN"} ${values.license_number.trim()}`
    : null;
  const specialties = values.specialties
    .map((v) => SPECIALTIES.findIndex((s) => s.value === v))
    .filter((i) => i >= 0)
    .map((i) => ({ label: SPECIALTIES[i].label, dot: DOT_COLORS[i % DOT_COLORS.length] }));
  const place = [values.clinic_name.trim(), values.city.trim() || values.province.trim()].filter(Boolean).join(" · ");

  return (
    <MockCard className="w-full max-w-[400px] p-6" style={cardMotion(120)}>
      <p className="mb-4 text-[11px] font-medium tracking-[0.14em] text-subtle uppercase">Tu perfil profesional</p>
      <div className="flex items-center gap-3.5">
        {name ? (
          <Avatar person={{ first_name: values.first_name, last_name: values.last_name }} size="lg" />
        ) : (
          <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-2 text-subtle">
            <UserRound className="size-6" />
          </span>
        )}
        <div className="min-w-0">
          <p className={cn("display truncate text-[24px] leading-tight", !name && "text-subtle")}>
            {name ? `Lic. ${name}` : "Tu nombre"}
          </p>
          <p className="truncate text-[13px] text-muted">
            {license ?? "Matrícula"}
            {values.license_type === "provincial" && values.license_province ? ` · ${values.license_province}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-5 flex min-h-8 flex-wrap gap-1.5">
        {specialties.length > 0 ? (
          <>
            {specialties.slice(0, 3).map((s) => (
              <Chip key={s.label} size="sm" dot={s.dot} tabIndex={-1}>
                {s.label}
              </Chip>
            ))}
            {specialties.length > 3 ? (
              <span className="inline-flex h-8 items-center rounded-full bg-surface-2 px-3 text-[13px] font-medium text-muted">
                +{specialties.length - 3}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span className="h-8 w-28 rounded-full bg-surface-2" />
            <span className="h-8 w-20 rounded-full bg-surface-2" />
            <span className="h-8 w-24 rounded-full bg-surface-2" />
          </>
        )}
      </div>

      <p className="mt-4 flex items-center gap-2 rounded-2xl bg-surface-2 px-3.5 py-3 text-[13px] text-ink-2">
        <MapPin className="size-4 shrink-0 text-muted" />
        <span className={cn("truncate", !place && "text-subtle")}>{place || "Tu consultorio"}</span>
      </p>
    </MockCard>
  );
}

export function RegisterAside({ values }: { values: ProfilePreview }) {
  return (
    <AuthAside
      title={["Tu consultorio,", "en orden desde hoy."]}
      footer={
        <>
          <ValueList
            items={[
              "Historia clínica completa y mapa corporal del dolor",
              "Evolución SOAP e informes listos para imprimir",
              "Solo vos accedés a los datos de tus pacientes",
            ]}
          />
          <TrustNote>
            Tratamos los datos de salud como información sensible y confidencial, según la Ley 25.326 y la Ley 26.529.
          </TrustNote>
        </>
      }
    >
      <div className="relative flex w-full flex-col items-center">
        <ProfilePreviewCard values={values} />
        <FloatingPill
          className="relative -mt-5 ml-auto h-12 text-[14px] xl:mr-2"
          icon={<ShieldCheck strokeWidth={1.8} className="text-brand-500" />}
          style={cardMotion(320)}
        >
          Datos privados y protegidos
        </FloatingPill>
      </div>
    </AuthAside>
  );
}

// ---------------------------------------------------------------------------
// Ingreso
// ---------------------------------------------------------------------------
export function LoginAside() {
  return (
    <AuthAside
      title={["Qué bueno", "verte de nuevo."]}
      description="Tus pacientes, sus historias y cada evolución te esperan donde los dejaste."
    >
      <div className="flex w-full max-w-[440px] flex-col gap-4">
        <PatientRowsMockCard className="w-full xl:-ml-4" style={cardMotion(100)} />
        <PainSummaryMockCard className="ml-auto w-[82%]" style={cardMotion(260)} />
      </div>
    </AuthAside>
  );
}

// ---------------------------------------------------------------------------
// Recuperar / restablecer / verificar
// ---------------------------------------------------------------------------
export function RecoverAside() {
  return (
    <AuthAside
      title={["Recuperá el acceso", "en un minuto."]}
      description="Te mandamos un link seguro para que elijas una contraseña nueva. Tus datos siguen intactos."
    >
      <div className="flex w-full max-w-[400px] flex-col">
        <EmailPreviewMockCard
          subject="Restablecé tu contraseña"
          body="Recibimos un pedido para cambiar la contraseña de tu cuenta. Tocá el botón para elegir una nueva."
          cta="Crear contraseña nueva"
          style={cardMotion(100)}
        />
        <FloatingPill
          className="relative -mt-5 ml-auto h-12 text-[14px]"
          icon={<KeyRound strokeWidth={1.8} className="text-brand-500" />}
          style={cardMotion(280)}
        >
          Link de un solo uso
        </FloatingPill>
      </div>
    </AuthAside>
  );
}

export function ResetAside() {
  return (
    <AuthAside
      title={["Una contraseña nueva,", "y seguís."]}
      description="Elegí una contraseña que no uses en otros sitios. Después entrás directo a tu consultorio."
    >
      <div className="flex w-full max-w-[380px] flex-col">
        <MockCard className="p-6" style={cardMotion(100)}>
          <p className="text-[13px] text-muted">Contraseña nueva</p>
          <div className="mt-2 flex h-12 items-center gap-1.5 rounded-field bg-surface-2 px-4">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="size-2 rounded-full bg-ink" />
            ))}
          </div>
          <div className="mt-3 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-1.5 flex-1 rounded-full bg-green" />
            ))}
          </div>
          <p className="mt-2 text-right text-[12px] font-medium text-ink-2">Muy segura</p>
        </MockCard>
        <FloatingPill
          className="relative -mt-4 ml-auto h-12 text-[14px]"
          icon={<Lock strokeWidth={1.8} className="text-brand-500" />}
          style={cardMotion(280)}
        >
          Cuenta protegida
        </FloatingPill>
      </div>
    </AuthAside>
  );
}

export function VerifyAside() {
  return (
    <AuthAside
      title={["Un paso más", "y empezamos."]}
      description="Confirmar tu email nos asegura que la cuenta es tuya y que vas a poder recuperarla si la necesitás."
    >
      <div className="flex w-full max-w-[400px] flex-col">
        <EmailPreviewMockCard
          subject="Confirmá tu cuenta en kine"
          body="¡Hola! Tocá el botón para confirmar tu email y empezar a cargar a tus pacientes."
          cta="Confirmar email"
          style={cardMotion(100)}
        />
        <FloatingPill
          className="relative -mt-5 ml-auto h-12 text-[14px]"
          icon={<ShieldCheck strokeWidth={1.8} className="text-brand-500" />}
          style={cardMotion(280)}
        >
          Verificación segura
        </FloatingPill>
      </div>
    </AuthAside>
  );
}
