import { ArrowRight, CalendarCheck, Check, ClipboardList, PersonStanding } from "lucide-react";
import Link from "next/link";
import { DecorCircles } from "@/components/ui/decor";
import { cn } from "@/lib/utils";

export type NextStepsState = { history: boolean; pain: boolean; session: boolean };

/**
 * Próximos pasos tras cargar un paciente: historia clínica → mapa corporal → primera sesión.
 * `welcome` = tarjeta oscura de bienvenida (recién creado); `subtle` = recordatorio liviano.
 */
export function NextStepsCard({
  patientId,
  firstName,
  done,
  tone,
  className,
}: {
  patientId: string;
  firstName: string;
  done: NextStepsState;
  tone: "welcome" | "subtle";
  className?: string;
}) {
  const base = `/pacientes/${patientId}`;
  const steps = [
    {
      key: "history",
      done: done.history,
      icon: ClipboardList,
      title: "Completá la historia clínica",
      text: "Antecedentes, hábitos, evaluación y plan.",
      href: `${base}/historia`,
    },
    {
      key: "pain",
      done: done.pain,
      icon: PersonStanding,
      title: "Registrá el dolor",
      text: "Tocá las zonas en el mapa corporal.",
      href: `${base}/mapa`,
    },
    {
      key: "session",
      done: done.session,
      icon: CalendarCheck,
      title: "Cargá la primera sesión",
      text: "Evolución SOAP y EVA antes y después.",
      href: `${base}/sesiones/nueva`,
    },
  ];
  const completed = steps.filter((s) => s.done).length;
  const welcome = tone === "welcome";

  return (
    <section
      aria-labelledby="next-steps-title"
      className={cn(
        "relative isolate overflow-hidden rounded-card p-6 sm:p-7",
        welcome ? "bg-gradient-to-br from-brand-900 via-brand-800 to-brand text-white" : "bg-surface",
        className,
      )}
    >
      {welcome ? <DecorCircles variant="b" className="-z-10 text-white/60" /> : null}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
          <div>
            <p className={cn("text-sm", welcome ? "text-white/85" : "text-muted")}>
              {welcome ? "Paciente creado" : "Primeros pasos"} · {completed} de {steps.length}
            </p>
            <h2 id="next-steps-title" className="display mt-2 text-[28px] sm:text-[32px]">
              {welcome ? (
                <>
                  <span className="font-light text-white/85">¡Listo! {firstName}</span>
                  <br />
                  <span className="font-medium">ya está en tu lista</span>
                </>
              ) : (
                <span className="font-medium text-ink">Completá la ficha de {firstName}</span>
              )}
            </h2>
          </div>
          <div className="flex w-full gap-1.5 md:mb-2 md:w-56" aria-hidden>
            {steps.map((s) => (
              <span
                key={s.key}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  s.done ? (welcome ? "bg-white" : "bg-ink") : welcome ? "bg-white/25" : "bg-surface-3",
                )}
              />
            ))}
          </div>
        </div>

        <ol className="grid flex-1 gap-2.5 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.key}>
                <Link
                  href={s.href}
                  className={cn(
                    "group flex h-full items-start gap-3 rounded-[20px] p-4 transition-colors",
                    welcome
                      ? "bg-white/10 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] hover:bg-white/15 focus-visible:outline-white"
                      : "bg-surface-2 hover:bg-surface-3/70",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
                      s.done
                        ? welcome
                          ? "bg-white text-brand"
                          : "bg-success text-white"
                        : welcome
                          ? "bg-white/15 text-white"
                          : "bg-surface text-ink-2 shadow-inset",
                    )}
                  >
                    {s.done ? <Check className="size-[18px]" aria-hidden /> : <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[13px]", welcome ? "text-white/80" : "text-muted")}>
                      Paso {i + 1}
                      {s.done ? " · Hecho" : ""}
                    </span>
                    <span className={cn("block text-[15px] font-medium", welcome ? "text-white" : "text-ink", s.done && "opacity-70")}>
                      {s.title}
                    </span>
                    <span className={cn("mt-0.5 block text-[13px]", welcome ? "text-white/80" : "text-muted")}>{s.text}</span>
                  </span>
                  <ArrowRight
                    aria-hidden
                    className={cn(
                      "mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                      welcome ? "text-white/70" : "text-muted",
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
