"use client";

import { ArrowRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ComponentType, type TouchEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { DarkPanel, type PanelTone } from "@/components/onboarding/dark-panel";
import {
  BodyMapIllustration,
  HistoryIllustration,
  IllustrationStage,
  SessionsIllustration,
  StartIllustration,
  WelcomeIllustration,
} from "@/components/onboarding/illustrations";
import { MOTION_ROOT_CLASS, MotionKeyframes, textMotion } from "@/components/onboarding/motion";
import { markOnboardedClient } from "@/components/onboarding/onboarded-cookie";
import { cn } from "@/lib/utils";

type TourStep = {
  name: string;
  tone: PanelTone;
  lines: [string, string];
  body: string;
  Illustration: ComponentType;
};

const TOUR_STEPS: TourStep[] = [
  {
    name: "Bienvenida",
    tone: "green",
    lines: ["Tus pacientes, ordenados.", "Su evolución, a la vista."],
    body: "kine es el registro clínico pensado para kinesiólogos: cargás a tus pacientes, su historia y cada sesión, y ves cómo evoluciona su dolor semana a semana.",
    Illustration: WelcomeIllustration,
  },
  {
    name: "Historia clínica",
    tone: "green",
    lines: ["Toda la historia,", "en un solo lugar."],
    body: "Anamnesis, antecedentes, signos vitales, goniometría, fuerza y pruebas especiales. Las contraindicaciones importantes quedan siempre a la vista.",
    Illustration: HistoryIllustration,
  },
  {
    name: "Mapa corporal",
    tone: "green",
    lines: ["Tocá donde duele.", "Registrá cada zona."],
    body: "Un cuerpo interactivo, de frente y de espalda. Marcá cada zona con su intensidad (EVA), el tipo de dolor y su frecuencia, y seguí cómo cambia con el tiempo.",
    Illustration: BodyMapIllustration,
  },
  {
    name: "Sesiones",
    tone: "blue",
    lines: ["Cada sesión suma.", "Medí el progreso."],
    body: "Registrá la evolución en formato SOAP, las técnicas aplicadas y el dolor antes y después. Los informes se arman solos, listos para imprimir.",
    Illustration: SessionsIllustration,
  },
  {
    name: "Empezá",
    tone: "green",
    lines: ["Tu consultorio,", "listo en minutos."],
    body: "Creá tu cuenta con tus datos profesionales y empezá a cargar pacientes hoy. Tus registros son privados: solo vos podés verlos.",
    Illustration: StartIllustration,
  },
];

const SWIPE_MIN_PX = 48;

function clampStep(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(TOUR_STEPS.length - 1, Math.trunc(n)));
}

/** Recorrido de bienvenida en 5 pasos (pantalla dividida, estilo daily). */
export function OnboardingTour({ initialStep = 0 }: { initialStep?: number }) {
  const total = TOUR_STEPS.length;
  const [step, setStep] = useState(() => clampStep(initialStep));
  const [direction, setDirection] = useState<1 | -1>(1);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const primaryRef = useRef<HTMLElement | null>(null);
  const interacted = useRef(false);

  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;

  const goTo = useCallback(
    (target: number) => {
      const next = clampStep(target);
      if (next === step) return;
      interacted.current = true;
      setDirection(next > step ? 1 : -1);
      setStep(next);
    },
    [step],
  );

  // Refleja el paso en la URL (sin navegar) para poder recargar o compartir.
  useEffect(() => {
    const url = step === 0 ? "/bienvenida" : `/bienvenida?paso=${step + 1}`;
    if (`${window.location.pathname}${window.location.search}` !== url) {
      window.history.replaceState(null, "", url);
    }
  }, [step]);

  // Si el foco quedó "perdido" (p. ej. se deshabilitó el botón Atrás), lo llevamos a la acción principal.
  useEffect(() => {
    if (!interacted.current) return;
    const active = document.activeElement;
    if (!active || active === document.body) primaryRef.current?.focus();
  }, [step]);

  // Navegación con flechas del teclado.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(step + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(step - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, step]);

  // Deslizar en pantallas táctiles.
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    goTo(dx < 0 ? step + 1 : step - 1);
  };

  const Illustration = current.Illustration;

  return (
    <main
      className={cn(
        MOTION_ROOT_CLASS,
        "flex min-h-dvh flex-col gap-2 overflow-x-clip p-2 sm:gap-3 sm:p-3 lg:h-dvh lg:min-h-[620px] lg:flex-row lg:gap-0 lg:p-4",
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <MotionKeyframes />

      {/* Panel ilustrado */}
      <DarkPanel
        tone={current.tone}
        className="h-[46dvh] max-h-[520px] min-h-[300px] shrink-0 rounded-[24px] sm:rounded-card lg:h-auto lg:max-h-none lg:w-1/2 xl:w-[55%]"
      >
        <div className="relative z-10 flex items-center justify-between p-4 sm:p-6 lg:p-8">
          <Logo inverted />
          <Link
            href="/registro"
            onClick={markOnboardedClient}
            className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.5)] transition-colors hover:bg-white/10 focus-visible:outline-white"
          >
            Saltar
          </Link>
        </div>
        <IllustrationStage key={step}>
          <Illustration />
        </IllustrationStage>
      </DarkPanel>

      {/* Contenido */}
      <section
        aria-roledescription="carrusel"
        aria-label="Recorrido de bienvenida"
        className="relative flex flex-1 flex-col px-3 pt-5 pb-3 sm:px-8 sm:pt-8 sm:pb-6 lg:justify-center lg:px-[clamp(2.5rem,4.6vw,6.5rem)] lg:py-10"
      >
        {!isLast ? (
          <p className="absolute top-8 right-10 hidden text-sm text-muted lg:block">
            ¿Ya tenés cuenta?{" "}
            <Link
              href="/ingresar"
              onClick={markOnboardedClient}
              className="font-medium text-ink underline-offset-4 hover:underline"
            >
              Ingresar
            </Link>
          </p>
        ) : null}

        <p className="sr-only" aria-live="polite">
          Paso {step + 1} de {total}: {current.name}
        </p>

        <div className="flex w-full max-w-[580px] flex-1 flex-col lg:flex-none 2xl:max-w-[680px]">
          <div key={step}>
            <p className="text-[15px] text-muted" style={textMotion(0, direction)}>
              Paso {step + 1} de {total} · <span className="font-medium text-ink">{current.name}</span>
            </p>
            <h1 className="display mt-4 text-[33px] text-ink min-[400px]:text-[36px] sm:mt-5 sm:text-[50px] lg:text-[38px] xl:text-[48px] 2xl:text-[58px]">
              <span className="block font-normal text-balance" style={textMotion(60, direction)}>
                {current.lines[0]}
              </span>
              <span className="block font-semibold text-balance" style={textMotion(120, direction)}>
                {current.lines[1]}
              </span>
            </h1>
            <p
              className="mt-5 max-w-[34rem] text-base leading-relaxed text-muted sm:mt-6 sm:text-[17px]"
              style={textMotion(180, direction)}
            >
              {current.body}
            </p>
          </div>

          <div className="mt-auto pt-8 lg:mt-12 lg:pt-0">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <ol className="flex items-center gap-1.5" aria-label="Pasos del recorrido">
                {TOUR_STEPS.map((s, i) => {
                  const active = i === step;
                  return (
                    <li key={s.name} className={cn("transition-[flex-grow] duration-500", active ? "flex-[2.4]" : "flex-1", "lg:flex-none")}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-label={`Ir al paso ${i + 1}: ${s.name}`}
                        aria-current={active ? "step" : undefined}
                        className="group flex h-10 w-full items-center rounded-full"
                      >
                        <span
                          className={cn(
                            "block h-1.5 w-full rounded-full transition-[width,background-color] duration-500 ease-out",
                            active ? "bg-ink lg:w-12" : "lg:w-7",
                            !active && (i < step ? "bg-muted/60 group-hover:bg-muted" : "bg-line-strong group-hover:bg-muted/50"),
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="icon-lg"
                  aria-label="Paso anterior"
                  disabled={isFirst}
                  onClick={() => goTo(step - 1)}
                  className="shadow-soft"
                >
                  <ChevronLeft />
                </Button>
                {isLast ? (
                  <ButtonLink
                    ref={(el: HTMLAnchorElement | null) => {
                      primaryRef.current = el;
                    }}
                    href="/registro"
                    size="lg"
                    onClick={markOnboardedClient}
                    iconRight={<ArrowRight />}
                    className="flex-1 lg:flex-none"
                  >
                    Crear cuenta
                  </ButtonLink>
                ) : (
                  <Button
                    ref={(el: HTMLButtonElement | null) => {
                      primaryRef.current = el;
                    }}
                    size="lg"
                    onClick={() => goTo(step + 1)}
                    iconRight={<ArrowRight />}
                    className="flex-1 lg:flex-none"
                  >
                    {isFirst ? "Empezar" : "Siguiente"}
                  </Button>
                )}
              </div>
            </div>

            {isLast ? (
              <div className="mt-3 flex lg:justify-end" style={textMotion(200, direction)}>
                <ButtonLink
                  href="/ingresar"
                  variant="ghost"
                  onClick={markOnboardedClient}
                  className="w-full text-muted hover:text-ink lg:w-auto"
                >
                  Ya tengo cuenta · <span className="font-semibold text-ink">Ingresar</span>
                </ButtonLink>
              </div>
            ) : (
              <p className="mt-4 text-center text-sm text-muted lg:hidden">
                ¿Ya tenés cuenta?{" "}
                <Link href="/ingresar" onClick={markOnboardedClient} className="font-medium text-ink underline-offset-4 hover:underline">
                  Ingresar
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
