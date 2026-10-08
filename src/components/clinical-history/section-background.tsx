"use client";

import { ShieldAlert, TriangleAlert } from "lucide-react";
import { ChipGroup, type ChipOption } from "@/components/ui/chip";
import { CharCount, FieldError, GroupLabel, TextAreaField } from "@/components/clinical-history/fields";
import type { FieldSectionProps } from "@/components/clinical-history/types";
import { CONDITIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ALERT_DOT = "var(--color-red)";

const CONDITION_OPTIONS: ChipOption[] = CONDITIONS.map((c) => ({
  value: c.value,
  label: c.label,
  dot: c.alert ? ALERT_DOT : undefined,
}));

const ALERT_CONDITIONS = new Map(CONDITIONS.filter((c) => c.alert).map((c) => [c.value, c.label]));

/** Condiciones marcadas que pueden contraindicar técnicas. */
export function selectedAlertLabels(conditions: string[]): string[] {
  return conditions.filter((c) => ALERT_CONDITIONS.has(c)).map((c) => ALERT_CONDITIONS.get(c) as string);
}

export function BackgroundSection({ values, errors, set }: FieldSectionProps) {
  const alerts = selectedAlertLabels(values.conditions);

  return (
    <div className="space-y-8">
      <div>
        <GroupLabel
          hint={
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: ALERT_DOT }} />
              Puede contraindicar técnicas
            </span>
          }
        >
          Patologías y condiciones
        </GroupLabel>
        <ChipGroup
          multiple
          size="sm"
          aria-label="Patologías y condiciones"
          options={CONDITION_OPTIONS}
          value={values.conditions}
          onChange={(next) => set("conditions", next)}
        />
        <FieldError>{errors.conditions}</FieldError>
        {alerts.length > 0 ? (
          <div
            role="note"
            className="mt-4 flex animate-fade-in items-start gap-3 rounded-panel bg-danger-50 px-4 py-3.5 text-[14px] text-ink-2"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-[18px] shrink-0 text-danger" strokeWidth={2} />
            <p>
              <span className="font-medium text-danger">Contraindicación a considerar: </span>
              {alerts.join(" · ")}. Revisá la sección de alertas antes de indicar agentes físicos o terapia manual.
            </p>
          </div>
        ) : null}
      </div>

      <TextAreaField
        label="Observaciones sobre las condiciones"
        placeholder="Diagnóstico, año, control médico, estado actual…"
        value={values.conditions_notes}
        onChange={(v) => set("conditions_notes", v)}
        max={4000}
        error={errors.conditions_notes}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextAreaField
          label="Cirugías"
          placeholder="Tipo de cirugía, fecha, lado…"
          value={values.surgeries}
          onChange={(v) => set("surgeries", v)}
          max={4000}
          error={errors.surgeries}
        />
        <TextAreaField
          label="Fracturas"
          placeholder="Hueso, fecha, tratamiento (yeso, osteosíntesis)…"
          value={values.fractures}
          onChange={(v) => set("fractures", v)}
          max={4000}
          error={errors.fractures}
        />
        <TextAreaField
          label="Medicación actual"
          placeholder="Fármaco, dosis y frecuencia"
          value={values.medications}
          onChange={(v) => set("medications", v)}
          max={4000}
          error={errors.medications}
        />
        <TextAreaField
          label="Alergias"
          placeholder="Medicamentos, látex, adhesivos, cremas…"
          value={values.allergies}
          onChange={(v) => set("allergies", v)}
          max={2000}
          error={errors.allergies}
        />
        <TextAreaField
          label="Antecedentes familiares"
          placeholder="Enfermedades relevantes en la familia"
          value={values.family_history}
          onChange={(v) => set("family_history", v)}
          max={4000}
          error={errors.family_history}
        />
        <TextAreaField
          label="Tratamientos previos"
          placeholder="Kinesiología, infiltraciones, otros tratamientos y su resultado"
          value={values.previous_treatments}
          onChange={(v) => set("previous_treatments", v)}
          max={4000}
          error={errors.previous_treatments}
        />
      </div>
    </div>
  );
}

export function AlertsSection({ values, errors, set }: FieldSectionProps) {
  const alerts = selectedAlertLabels(values.conditions);
  const hasFlags = values.red_flags.trim() !== "";

  return (
    <div
      className={cn(
        "rounded-panel p-4 transition-colors sm:p-6",
        hasFlags || alerts.length > 0 ? "bg-danger-50" : "bg-surface-2",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
            hasFlags || alerts.length > 0 ? "bg-danger text-white" : "bg-surface text-ink-2 shadow-inset",
          )}
        >
          <ShieldAlert className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <label htmlFor="hc-red-flags" className="text-[15px] font-medium text-ink">
            Banderas rojas y contraindicaciones
          </label>
          <p className="mt-0.5 text-sm text-muted">
            Signos de alarma, precauciones y técnicas a evitar. Se destacan en la ficha del paciente.
          </p>
        </div>
      </div>

      <textarea
        id="hc-red-flags"
        rows={4}
        value={values.red_flags}
        onChange={(e) => set("red_flags", e.target.value)}
        placeholder="Ej.: Marcapasos — no usar electroterapia ni magnetoterapia. Dolor nocturno que no cede con el reposo: derivar si persiste."
        aria-invalid={errors.red_flags ? true : undefined}
        aria-describedby={errors.red_flags ? "hc-red-flags-error" : undefined}
        className="mt-4 max-h-[28rem] min-h-28 w-full resize-y rounded-field [field-sizing:content] bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink shadow-inset outline-none placeholder:text-subtle focus:shadow-[0_0_0_1.5px_var(--color-ink)] focus-visible:outline-none aria-[invalid=true]:shadow-[0_0_0_1.5px_var(--color-danger)]"
      />
      <div className="mt-1.5 flex justify-end">
        <CharCount value={values.red_flags} max={4000} />
      </div>
      <FieldError id="hc-red-flags-error">{errors.red_flags}</FieldError>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">Desde antecedentes:</span>
        {alerts.length > 0 ? (
          alerts.map((label) => (
            <span
              key={label}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium text-ink-2 shadow-inset"
            >
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: ALERT_DOT }} />
              {label}
            </span>
          ))
        ) : (
          <span className="text-[13px] text-subtle">sin condiciones de riesgo marcadas</span>
        )}
      </div>
    </div>
  );
}
