"use client";

import type { ReactNode } from "react";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { ScaleBar } from "@/components/ui/scale";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented";
import {
  FieldError,
  GroupLabel,
  NumberStepper,
  TextAreaField,
  TextInputField,
} from "@/components/clinical-history/fields";
import { ACTIVITY_FREQUENCY_CHIPS } from "@/components/clinical-history/catalog";
import type { FieldSectionProps } from "@/components/clinical-history/types";
import { ALCOHOL_OPTIONS, SLEEP_QUALITY_OPTIONS, SMOKING_OPTIONS, WORK_TYPE_OPTIONS } from "@/lib/constants";

/** Control segmentado que admite "sin respuesta" (tocar la opción activa la desmarca). */
function OptionalSegmented<V extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: SegmentedOption<V>[];
  value: V | "";
  onChange: (value: V | "") => void;
  error?: string | null;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[13px] font-medium text-ink-2">{label}</p>
      <SegmentedControl<V | "">
        aria-label={label}
        options={options}
        value={value}
        onChange={(next) => onChange(next === value ? "" : next)}
        className="flex w-full [&>button]:min-w-0 [&>button]:flex-1 [&>button]:justify-center [&>button]:px-2 sm:[&>button]:px-3"
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}

function Pair({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

export function HabitsSection({ values, errors, set }: FieldSectionProps) {
  return (
    <div className="space-y-7">
      <Pair>
        <TextInputField
          label="Actividad física"
          placeholder="Ej.: running, pilates, fútbol"
          value={values.physical_activity}
          onChange={(v) => set("physical_activity", v)}
          max={1000}
          error={errors.physical_activity}
        />
        <div className="min-w-0">
          <TextInputField
            label="Frecuencia"
            placeholder="Ej.: 3 veces por semana, 1 h"
            value={values.physical_activity_frequency}
            onChange={(v) => set("physical_activity_frequency", v)}
            max={200}
            error={errors.physical_activity_frequency}
          />
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Frecuencias rápidas">
            {ACTIVITY_FREQUENCY_CHIPS.map((f) => (
              <Chip
                key={f}
                size="sm"
                selected={values.physical_activity_frequency === f}
                onClick={() => set("physical_activity_frequency", values.physical_activity_frequency === f ? "" : f)}
              >
                {f}
              </Chip>
            ))}
          </div>
        </div>
      </Pair>

      <Pair>
        <OptionalSegmented
          label="Tabaquismo"
          options={SMOKING_OPTIONS}
          value={values.smoking}
          onChange={(v) => set("smoking", v)}
          error={errors.smoking}
        />
        <OptionalSegmented
          label="Alcohol"
          options={ALCOHOL_OPTIONS}
          value={values.alcohol}
          onChange={(v) => set("alcohol", v)}
          error={errors.alcohol}
        />
      </Pair>

      <Pair>
        <NumberStepper
          label="Horas de sueño"
          value={values.sleep_hours}
          onChange={(v) => set("sleep_hours", v)}
          step={0.5}
          min={0}
          max={24}
          decimals={1}
          unit="h"
          error={errors.sleep_hours}
        />
        <OptionalSegmented
          label="Calidad del sueño"
          options={SLEEP_QUALITY_OPTIONS}
          value={values.sleep_quality}
          onChange={(v) => set("sleep_quality", v)}
          error={errors.sleep_quality}
        />
      </Pair>

      <div>
        <GroupLabel>Tipo de trabajo</GroupLabel>
        <ChipGroup
          size="sm"
          aria-label="Tipo de trabajo"
          options={WORK_TYPE_OPTIONS}
          value={values.work_type ? [values.work_type] : []}
          onChange={(next) => set("work_type", (next[0] as typeof values.work_type | undefined) ?? "")}
        />
        <FieldError>{errors.work_type}</FieldError>
      </div>

      <TextAreaField
        label="Postura y ergonomía laboral"
        placeholder="Horas frente a la computadora, posturas sostenidas, gestos repetitivos, cargas…"
        value={values.work_posture_notes}
        onChange={(v) => set("work_posture_notes", v)}
        max={2000}
        error={errors.work_posture_notes}
      />

      <div>
        <ScaleBar
          min={0}
          max={10}
          tone="pain"
          label="Nivel de estrés"
          description="¿Cuánto estrés percibe en su día a día?"
          dot="var(--color-violet)"
          value={values.stress_level}
          onChange={(v) => set("stress_level", v)}
        />
        <FieldError>{errors.stress_level}</FieldError>
      </div>
    </div>
  );
}
