"use client";

import { Chip } from "@/components/ui/chip";
import { NumberStepper, TextAreaField, TextInputField } from "@/components/clinical-history/fields";
import { SESSION_FREQUENCY_CHIPS } from "@/components/clinical-history/catalog";
import type { FieldSectionProps } from "@/components/clinical-history/types";

export function PlanSection({ values, errors, set }: FieldSectionProps) {
  return (
    <div className="space-y-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextAreaField
          label="Objetivos a corto plazo"
          placeholder="Ej.: disminuir el dolor a EVA ≤ 3 en 2 semanas"
          rows={4}
          value={values.short_term_goals}
          onChange={(v) => set("short_term_goals", v)}
          max={4000}
          error={errors.short_term_goals}
        />
        <TextAreaField
          label="Objetivos a largo plazo"
          placeholder="Ej.: volver a correr 10 km sin dolor"
          rows={4}
          value={values.long_term_goals}
          onChange={(v) => set("long_term_goals", v)}
          max={4000}
          error={errors.long_term_goals}
        />
      </div>

      <TextAreaField
        label="Plan de tratamiento"
        placeholder="Fases, técnicas, ejercicios domiciliarios, criterios de progresión y de alta…"
        rows={6}
        value={values.treatment_plan}
        onChange={(v) => set("treatment_plan", v)}
        max={8000}
        error={errors.treatment_plan}
      />

      <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)]">
        <NumberStepper
          label="Sesiones prescriptas"
          value={values.prescribed_sessions}
          onChange={(v) => set("prescribed_sessions", v)}
          step={1}
          min={0}
          max={500}
          error={errors.prescribed_sessions}
        />
        <div className="min-w-0">
          <TextInputField
            label="Frecuencia"
            placeholder="Ej.: 2 veces por semana"
            value={values.session_frequency}
            onChange={(v) => set("session_frequency", v)}
            max={100}
            error={errors.session_frequency}
          />
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Frecuencias habituales">
            {SESSION_FREQUENCY_CHIPS.map((f) => (
              <Chip
                key={f}
                size="sm"
                selected={values.session_frequency === f}
                onClick={() => set("session_frequency", values.session_frequency === f ? "" : f)}
              >
                {f}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
