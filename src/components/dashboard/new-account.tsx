import { ArrowRight, ClipboardList, NotebookPen, PersonStanding } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { DecorCircles } from "@/components/ui/decor";
import { DOT_COLORS, PAIN_STATUS } from "@/lib/constants";
import { cn, painColor, painTextColor } from "@/lib/utils";

const MOCK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

function MiniPain({ value }: { value: number }) {
  return (
    <span
      className="tabular inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold"
      style={{ backgroundColor: painColor(value), color: painTextColor(value) }}
    >
      {value}
    </span>
  );
}

/** Tarjetas flotantes ilustrativas (como las del onboarding de daily). Puramente decorativas. */
function HeroIllustration({ todayIndex }: { todayIndex: number }) {
  return (
    <div aria-hidden className="relative mx-auto h-[350px] w-full max-w-[460px] select-none sm:h-[370px]">
      {/* Semana */}
      <div className="absolute top-0 left-0 w-[78%] max-w-[300px] animate-fade-up rounded-[22px] bg-white p-3.5 text-ink shadow-float sm:p-4">
        <p className="text-[12px] text-muted sm:text-[13px]">Esta semana</p>
        <div className="mt-2.5 grid grid-cols-7 gap-1 sm:gap-1.5">
          {MOCK_DAYS.map((d, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center rounded-xl py-1.5 sm:py-2",
                i === todayIndex ? "bg-ink text-white" : "bg-surface-2",
              )}
            >
              <span className={cn("text-[9px] sm:text-[10px]", i === todayIndex ? "text-white/60" : "text-muted")}>{d}</span>
              <span className="display text-[14px] sm:text-[16px]">{i + 5}</span>
              <span
                className={cn("mt-0.5 size-1 rounded-full", i <= todayIndex ? "bg-green" : "bg-line-strong")}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Paciente */}
      <div
        className="absolute top-[35%] right-0 w-[86%] max-w-[330px] animate-fade-up rounded-[22px] bg-white p-3 text-ink shadow-float sm:p-3.5"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center gap-2.5">
          <Avatar person={{ id: "mock-laura", first_name: "Laura", last_name: "Gómez" }} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium sm:text-sm">Laura Gómez</p>
            <p className="truncate text-[11px] text-muted sm:text-xs">Lumbalgia mecánica · Sesión 6</p>
          </div>
          <div className="flex items-center gap-1">
            <MiniPain value={7} />
            <ArrowRight className="size-3 text-subtle" />
            <MiniPain value={3} />
          </div>
        </div>
        <div className="mt-2.5 flex flex-nowrap gap-1.5 overflow-hidden border-t border-line pt-2.5">
          {[
            ["Terapia manual", DOT_COLORS[0]],
            ["Ejercicio terapéutico", DOT_COLORS[2]],
          ].map(([label, color], i) => (
            <span
              key={label}
              className={cn(
                "h-6 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-2 text-[11px] font-medium whitespace-nowrap text-ink-2",
                i === 0 ? "inline-flex" : "hidden sm:inline-flex",
              )}
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Resumen azul */}
      <div
        className="absolute bottom-0 left-[3%] w-[62%] max-w-[250px] animate-fade-up overflow-hidden rounded-[22px] bg-accent p-4 text-white shadow-float"
        style={{ animationDelay: "240ms" }}
      >
        <DecorCircles variant="a" className="text-white/60" />
        <span className="relative inline-flex h-6 items-center rounded-full px-2.5 text-[11px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.7)]">
          Resumen
        </span>
        <div className="relative mt-3 flex gap-5">
          <div>
            <p className="text-[10px] text-white/75">EVA promedio</p>
            <p className="display text-[30px] leading-none">
              4,2<span className="text-[11px] text-white/70">/10</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white/75">Asistencia</p>
            <p className="display text-[30px] leading-none">
              92<span className="text-[11px] text-white/70">%</span>
            </p>
          </div>
        </div>
      </div>

      {/* Chip mapa corporal */}
      <div
        className="absolute right-0 bottom-[5%] hidden animate-fade-up items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-ink shadow-float sm:inline-flex"
        style={{ animationDelay: "360ms" }}
      >
        <span className="size-2 rounded-full" style={{ backgroundColor: PAIN_STATUS.active.color }} />
        Zona lumbar · Punzante
      </div>
    </div>
  );
}

/** Héroe para cuentas nuevas (sin pacientes): invita a cargar el primero. */
export function NewAccountHero({ todayIndex, className }: { todayIndex: number; className?: string }) {
  return (
    <section
      aria-labelledby="new-account-title"
      className={cn(
        "relative isolate overflow-hidden rounded-card bg-gradient-to-br from-ink via-brand-900 to-brand-700 text-white",
        className,
      )}
    >
      <DecorCircles variant="b" className="-z-10 text-white/50" />
      <div className="grid items-center gap-10 p-7 sm:p-10 xl:grid-cols-[1.05fr_1fr] xl:gap-8 xl:p-12">
        <div className="animate-fade-up">
          <p className="text-[15px] text-white/60">
            Tu consultorio · <span className="font-medium text-white">Primer paso</span>
          </p>
          <h2 id="new-account-title" className="display mt-4 text-[42px] sm:text-[54px]">
            <span className="block font-light">Tus pacientes,</span>
            <span className="block font-semibold">en orden.</span>
          </h2>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-white/70">
            Agregá tu primer paciente y empezá a registrar su historia clínica, sus dolores en el mapa corporal y su evolución
            sesión a sesión.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/pacientes/nuevo" variant="inverse" size="lg" iconRight={<ArrowRight />}>
              Agregá tu primer paciente
            </ButtonLink>
            <ButtonLink
              href="/ajustes"
              variant="ghost"
              size="lg"
              className="px-5 text-white hover:bg-white/10 focus-visible:outline-white"
            >
              Completar mi perfil
            </ButtonLink>
          </div>
        </div>
        <HeroIllustration todayIndex={todayIndex} />
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Historia clínica completa",
    text: "Antecedentes, hábitos, examen físico, pruebas especiales y plan terapéutico.",
    tone: "bg-accent-100 text-accent",
  },
  {
    icon: PersonStanding,
    title: "Mapa corporal del dolor",
    text: "Tocá la zona del cuerpo y registrá intensidad, tipo y evolución de cada dolor.",
    tone: "bg-warning-50 text-orange",
  },
  {
    icon: NotebookPen,
    title: "Sesiones e informes",
    text: "Evolución SOAP sesión a sesión e informes listos para imprimir o compartir.",
    tone: "bg-brand-50 text-brand",
  },
] as const;

/** Qué se puede hacer en kine (acompaña al héroe de cuenta nueva). */
export function FeatureCard({ wide = false, className }: { wide?: boolean; className?: string }) {
  return (
    <section aria-labelledby="features-title" className={cn("rounded-card bg-surface p-6 sm:p-8", className)}>
      <h2 id="features-title" className="display text-[24px] font-medium text-ink">
        Todo en un mismo lugar
      </h2>
      <p className="mt-1 text-sm text-muted">Pensado para el día a día del consultorio de kinesiología.</p>
      <ul className={cn("mt-6 grid gap-3", wide && "md:grid-cols-3")}>
        {FEATURES.map(({ icon: Icon, title, text, tone }) => (
          <li key={title} className="flex gap-4 rounded-panel bg-surface-2 p-4 sm:p-5">
            <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-full", tone)}>
              <Icon className="size-5" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-ink">{title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
