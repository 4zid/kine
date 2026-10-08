import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import {
  AlertPill,
  AnamnesisMockCard,
  BodyMapMockCard,
  ChecklistMockCard,
  FloatingPill,
  GoniometryMockCard,
  NewPatientPill,
  PainChartMockCard,
  PainPopoverMockCard,
  PainSummaryMockCard,
  PatientRowsMockCard,
  PrivacyPill,
  ProfileMockCard,
  ProgressPill,
  SoapMockCard,
  VitalsMockCard,
  WeekMockCard,
} from "@/components/onboarding/mock-cards";
import { cardMotion } from "@/components/onboarding/motion";
import { cn } from "@/lib/utils";

/**
 * Escenario de 560×560 px que se escala según el tamaño del panel.
 * Las tarjetas se posicionan en px dentro del escenario; el escalado
 * por breakpoint (y por alto de pantalla) mantiene la composición.
 */
export function IllustrationStage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      inert
      aria-hidden
      className={cn("pointer-events-none absolute inset-x-0 top-16 bottom-0 flex items-center justify-center select-none lg:top-20", className)}
    >
      <div
        className={cn(
          "relative h-[560px] w-[560px] shrink-0 origin-center",
          "scale-[0.54] min-[400px]:scale-[0.58] sm:scale-[0.72] lg:scale-[0.8] xl:scale-100 2xl:scale-[1.18]",
          "[@media(max-height:720px)]:scale-[0.5] sm:[@media(max-height:720px)]:scale-[0.56] lg:[@media(max-height:820px)]:scale-[0.76] xl:[@media(max-height:820px)]:scale-[0.86] lg:[@media(max-height:700px)]:scale-[0.68]",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function WelcomeIllustration() {
  return (
    <>
      <WeekMockCard className="absolute top-[18px] left-[36px] w-[340px]" style={cardMotion(80)} />
      <PatientRowsMockCard className="absolute top-[176px] left-[92px] w-[440px]" style={cardMotion(220)} />
      <PainSummaryMockCard className="absolute top-[364px] left-[186px] w-[340px]" style={cardMotion(380)} />
      <NewPatientPill className="absolute top-[430px] left-[0px]" style={cardMotion(540)} />
    </>
  );
}

export function HistoryIllustration() {
  return (
    <>
      <AnamnesisMockCard className="absolute top-[0px] left-[10px] w-[410px]" style={cardMotion(80)} />
      <VitalsMockCard className="absolute top-[300px] left-[328px] w-[236px]" style={cardMotion(240)} />
      <GoniometryMockCard className="absolute top-[330px] left-[0px] w-[320px]" style={cardMotion(380)} />
      <AlertPill className="absolute top-[106px] left-[372px] rotate-[3deg]" style={cardMotion(560)} />
    </>
  );
}

export function BodyMapIllustration() {
  return (
    <>
      <BodyMapMockCard className="absolute top-[0px] left-[24px] w-[268px]" style={cardMotion(80, { float: false })} />
      <PainPopoverMockCard className="absolute top-[140px] left-[258px] w-[296px]" style={cardMotion(320)} />
      <FloatingPill
        className="absolute top-[462px] left-[250px] h-12 text-[14px]"
        icon={<Sparkles strokeWidth={1.8} className="text-orange" />}
        style={cardMotion(520)}
      >
        Tocá una zona para registrar
      </FloatingPill>
    </>
  );
}

export function SessionsIllustration() {
  return (
    <>
      <PainSummaryMockCard
        className="absolute top-[10px] left-[0px] w-[310px]"
        label="Evolución"
        from="8"
        to="2"
        fromLabel="Dolor inicial"
        toLabel="Dolor actual"
        footnote="7 sesiones en 4 semanas"
        style={cardMotion(80)}
      />
      <SoapMockCard className="absolute top-[60px] left-[290px] w-[270px]" style={cardMotion(240)} />
      <PainChartMockCard className="absolute top-[340px] left-[30px] w-[460px]" style={cardMotion(400)} />
      <ProgressPill className="absolute top-[250px] left-[36px] h-12 text-[14px]" style={cardMotion(560)} />
    </>
  );
}

export function StartIllustration() {
  return (
    <>
      <ProfileMockCard className="absolute top-[40px] left-[0px] w-[380px]" style={cardMotion(80)} />
      <PrivacyPill className="absolute top-[14px] left-[290px] rotate-[2deg]" style={cardMotion(440)} />
      <ChecklistMockCard className="absolute top-[296px] left-[200px] w-[340px]" style={cardMotion(260)} />
    </>
  );
}
