import { ArrowRight, CalendarPlus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { DecorCircles } from "@/components/ui/decor";
import { PAIN_SERIES } from "@/components/sessions/session-utils";

const MOCK_BARS: [number, number][] = [
  [8, 6],
  [7, 5],
  [7, 4],
  [6, 4],
  [5, 3],
  [4, 2],
];

/** Estado vacío de la evolución, con una vista previa ilustrada (estilo onboarding de daily). */
export function SessionsEmpty({ newHref }: { newHref: string }) {
  return (
    <section className="grid animate-fade-up overflow-hidden rounded-card bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col justify-center p-7 sm:p-10">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-surface-2 text-ink-2">
          <CalendarPlus className="size-5" strokeWidth={1.8} aria-hidden />
        </span>
        <h2 className="display mt-6 text-[34px] text-ink sm:text-[42px]">
          <span className="font-light">Todavía no hay</span>
          <br />
          <span className="font-semibold">sesiones registradas.</span>
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
          Registrá cada encuentro con formato SOAP, las técnicas que usaste y el dolor al empezar y al terminar. Acá vas
          a ver cómo evoluciona el tratamiento sesión a sesión.
        </p>
        <ButtonLink href={newHref} size="lg" iconRight={<ArrowRight />} className="mt-8 self-start">
          Registrar primera sesión
        </ButtonLink>
      </div>

      <div
        aria-hidden
        className="relative m-2 min-h-[280px] overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0b0b2e] via-accent-900 to-accent-700 sm:min-h-[340px]"
      >
        <DecorCircles className="text-white/70" variant="b" />
        <div className="absolute top-1/2 left-1/2 w-[78%] max-w-[340px] -translate-x-1/2 -translate-y-[58%] rotate-[-2deg] rounded-[22px] bg-surface p-5 shadow-float">
          <p className="text-[13px] text-muted">Dolor por sesión</p>
          <div className="mt-4 flex h-28 items-end justify-between gap-2">
            {MOCK_BARS.map(([b, a], i) => (
              <div key={i} className="flex items-end gap-[2px]">
                <span
                  className="w-2.5 rounded-t-[3px]"
                  style={{ height: b * 10, backgroundColor: PAIN_SERIES.before.color }}
                />
                <span
                  className="w-2.5 rounded-t-[3px]"
                  style={{ height: a * 10, backgroundColor: PAIN_SERIES.after.color }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute right-[7%] bottom-[9%] w-[62%] max-w-[250px] rotate-[1.5deg] rounded-[20px] bg-surface px-4 py-3.5 shadow-float">
          <p className="flex items-center gap-2 text-[12px] text-muted">
            <span className="display inline-flex size-5 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-ink-2">
              S
            </span>
            Subjetivo
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-ink">
            Sube escaleras con menos dolor que la semana pasada.
          </p>
        </div>
      </div>
    </section>
  );
}
