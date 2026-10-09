"use client";

import { useId, useRef, type ReactNode } from "react";
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

/**
 * Control segmentado que admite "sin respuesta": el botón "Borrar" (o volver a tocar la opción
 * activa con el mouse o el dedo) la desmarca. Con teclado se comporta como un radio: Espacio/Enter
 * sobre la opción elegida no la desmarca.
 */
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
  const uid = useId();
  const labelId = `${uid}-label`;
  const errorId = `${uid}-error`;
  const pointer = useRef(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const clear = () => {
    onChange("");
    // El botón "Borrar" desaparece: el foco pasa al control para no perderse.
    requestAnimationFrame(() => groupRef.current?.querySelector<HTMLElement>("[role='radio']")?.focus());
  };
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
        <p id={labelId} className="text-[13px] font-medium text-ink-2">
          {label}
        </p>
        {value ? (
          <button
            type="button"
            onClick={clear}
            aria-label={`Borrar ${label.toLowerCase()}`}
            className="-my-2.5 inline-flex h-10 items-center rounded-full px-3 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Borrar
          </button>
        ) : null}
      </div>
      <div
        ref={groupRef}
        role="group"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        onPointerDownCapture={() => {
          pointer.current = true;
        }}
        onKeyDownCapture={() => {
          pointer.current = false;
        }}
      >
        <SegmentedControl<V | "">
          aria-label={label}
          options={options}
          value={value}
          onChange={(next) => onChange(next === value && pointer.current ? "" : next)}
          className="flex w-full [&>button]:min-w-0 [&>button]:flex-1 [&>button]:justify-center [&>button]:px-2 sm:[&>button]:px-3"
        />
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

function Pair({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

export function HabitsSection({ values, errors, set }: FieldSectionProps) {
  const uid = useId();
  const workLabelId = `${uid}-work`;
  const workErrorId = `${uid}-work-error`;
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
        <GroupLabel>
          <span id={workLabelId}>Tipo de trabajo</span>
        </GroupLabel>
        <div role="group" aria-labelledby={workLabelId} aria-describedby={errors.work_type ? workErrorId : undefined}>
          <ChipGroup
            size="sm"
            options={WORK_TYPE_OPTIONS}
            value={values.work_type ? [values.work_type] : []}
            onChange={(next) => set("work_type", (next[0] as typeof values.work_type | undefined) ?? "")}
          />
        </div>
        <FieldError id={workErrorId}>{errors.work_type}</FieldError>
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
        {/* No es una escala de dolor: color propio y anclas de estrés (no las de la EVA). */}
        <ScaleBar
          min={0}
          max={10}
          tone="var(--color-violet)"
          label="Nivel de estrés"
          description="¿Cuánto estrés percibe en su día a día? 0 = nada · 10 = el máximo."
          dot="var(--color-violet)"
          value={values.stress_level}
          onChange={(v) => set("stress_level", v)}
        />
        <FieldError>{errors.stress_level}</FieldError>
      </div>
    </div>
  );
}
