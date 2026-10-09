"use client";

import { ArrowRight, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { toast } from "sonner";
import { actionFailure } from "@/components/auth/action-guard";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState, type ActionState } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ChecklistStep } from "@/components/dashboard/data";
import { FramedCard } from "@/components/dashboard/framed-card";

import type { FormAction } from "@/lib/types";
export type { FormAction };

/** Guía "Primeros pasos" (visible hasta que el profesional la oculta). */
export function OnboardingChecklist({
  steps,
  dismissAction,
  className,
}: {
  steps: ChecklistStep[];
  dismissAction: FormAction;
  className?: string;
}) {
  const [, formAction, isPending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    let result: ActionState;
    try {
      result = await dismissAction(prev, formData);
    } catch (error) {
      result = actionFailure(error);
    }
    if (result.ok) toast.success(result.message ?? "Listo, ocultamos la guía.");
    else toast.error(result.message ?? "No pudimos ocultar la guía. Probá de nuevo.");
    return result;
  }, initialActionState);

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <FramedCard
      as="section"
      aria-labelledby="onboarding-title"
      className={className}
      footer={
        <form action={formAction} className="contents">
          <p className="min-w-0 flex-1 text-[13px] text-muted sm:text-sm">
            {allDone ? "¡Completaste todo! Ya podés ocultar esta guía." : "Podés ocultarla cuando quieras."}
          </p>
          <SubmitButton
            pending={isPending}
            variant={allDone ? "primary" : "inverse"}
            className={cn("h-11 px-5", !allDone && "shadow-soft")}
          >
            Listo, ocultar
          </SubmitButton>
        </form>
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] text-muted">
            {allDone ? "Todo listo" : `Paso ${currentIndex + 1} de ${steps.length}`} ·{" "}
            <span className="font-medium text-ink">Primeros pasos</span>
          </p>
          <h2 id="onboarding-title" className="display mt-1.5 text-[26px] leading-tight font-normal text-ink sm:text-[30px]">
            Dejá tu consultorio <span className="font-semibold">listo para atender.</span>
          </h2>
        </div>
        <p className="display tabular shrink-0 pt-1 text-ink">
          <span aria-hidden>
            <span className="text-[26px] font-medium">{doneCount}</span>
            <span className="text-base text-muted">/{steps.length}</span>
          </span>
          <span className="sr-only">
            {doneCount} de {steps.length} pasos completados
          </span>
        </p>
      </div>

      <div className="mt-5 flex gap-1.5" aria-hidden>
        {steps.map((s, i) => (
          <span
            key={s.key}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              s.done ? "flex-[1.6] bg-ink" : i === currentIndex ? "flex-1 bg-ink/25" : "flex-1 bg-surface-3",
            )}
          />
        ))}
      </div>

      <ol className="-mx-2 mt-6 flex flex-col gap-1">
        {steps.map((s, i) => {
          const current = i === currentIndex;
          return (
            <li key={s.key}>
              <Link
                href={s.href}
                className={cn(
                  "group flex items-center gap-3.5 rounded-[20px] p-2.5 transition-colors sm:p-3",
                  current ? "bg-surface-2 hover:bg-surface-3/70" : "hover:bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "tabular inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    s.done ? "bg-brand text-white" : current ? "bg-ink text-white" : "bg-surface-2 text-muted shadow-inset",
                  )}
                >
                  {s.done ? <Check className="size-4" strokeWidth={2.5} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[15px] font-medium", s.done ? "text-muted line-through decoration-line-strong" : "text-ink")}>
                    {s.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted">{s.description}</span>
                  {current ? (
                    <span
                      aria-hidden
                      className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-medium text-white transition-colors group-hover:bg-ink-2"
                    >
                      {s.cta}
                      <ArrowRight className="size-3.5" />
                    </span>
                  ) : null}
                </span>
                {s.done ? <span className="sr-only">Completado</span> : null}
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </Link>
            </li>
          );
        })}
      </ol>
    </FramedCard>
  );
}
