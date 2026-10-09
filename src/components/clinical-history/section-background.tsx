"use client";

import { ShieldAlert, TriangleAlert } from "lucide-react";
import { useId } from "react";
import { Chip } from "@/components/ui/chip";
import { CharCount, FieldError, GroupLabel, TextAreaField } from "@/components/clinical-history/fields";
import type { FieldSectionProps } from "@/components/clinical-history/types";
import { CONDITIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Nivel de alerta de un antecedente. El catálogo marca `alert` (aparece en los avisos clínicos);
 * `severity: "precaution"` (o `precaution: true`) lo baja a "requiere precaución".
 */
type ConditionTier = "contraindication" | "precaution";
type ConditionFlags = { alert?: boolean; severity?: unknown; precaution?: unknown };

function tierOf(condition: (typeof CONDITIONS)[number]): ConditionTier | null {
  const flags = condition as ConditionFlags;
  if (flags.severity === "precaution" || flags.precaution === true) return "precaution";
  return flags.alert ? "contraindication" : null;
}

const TIER_META: Record<ConditionTier, { dot: string; label: string; sr: string }> = {
  contraindication: { dot: "var(--color-red)", label: "Puede contraindicar técnicas", sr: "puede contraindicar técnicas" },
  precaution: { dot: "var(--color-yellow)", label: "Requiere precaución", sr: "requiere precaución" },
};

type ConditionInfo = { value: string; label: string; hint?: string; tier: ConditionTier | null };

const CONDITION_INFO: ConditionInfo[] = CONDITIONS.map((c) => ({
  value: c.value,
  label: c.label,
  hint: c.hint,
  tier: tierOf(c),
}));
const HAS_PRECAUTIONS = CONDITION_INFO.some((c) => c.tier === "precaution");

/** Condiciones marcadas que pueden contraindicar técnicas o requieren precaución (orden del catálogo). */
export function selectedAlerts(conditions: string[]): {
  contraindications: ConditionInfo[];
  precautions: ConditionInfo[];
} {
  const picked = CONDITION_INFO.filter((c) => c.tier && conditions.includes(c.value));
  return {
    contraindications: picked.filter((c) => c.tier === "contraindication"),
    precautions: picked.filter((c) => c.tier === "precaution"),
  };
}

/** Etiquetas de las condiciones marcadas con alerta (contraindicación o precaución). */
export function selectedAlertLabels(conditions: string[]): string[] {
  const { contraindications, precautions } = selectedAlerts(conditions);
  return [...contraindications, ...precautions].map((c) => c.label);
}

function TierDot({ tier }: { tier: ConditionTier }) {
  return (
    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: TIER_META[tier].dot }} />
  );
}

export function BackgroundSection({ values, errors, set }: FieldSectionProps) {
  const { contraindications, precautions } = selectedAlerts(values.conditions);
  const withHints = [...contraindications, ...precautions].filter((c) => c.hint);
  const uid = useId();
  const labelId = `${uid}-label`;
  const legendId = `${uid}-legend`;
  const errorId = `${uid}-error`;

  const toggle = (value: string) =>
    set(
      "conditions",
      values.conditions.includes(value) ? values.conditions.filter((v) => v !== value) : [...values.conditions, value],
    );

  return (
    <div className="space-y-8">
      <div>
        <GroupLabel
          hint={
            <span id={legendId} className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <TierDot tier="contraindication" />
                {TIER_META.contraindication.label}
              </span>
              {HAS_PRECAUTIONS ? (
                <span className="inline-flex items-center gap-1.5">
                  <TierDot tier="precaution" />
                  {TIER_META.precaution.label}
                </span>
              ) : null}
              <span>(lista orientativa)</span>
            </span>
          }
        >
          <span id={labelId}>Patologías y condiciones</span>
        </GroupLabel>
        <div
          role="group"
          aria-labelledby={labelId}
          aria-describedby={errors.conditions ? `${errorId} ${legendId}` : legendId}
          className="flex flex-wrap gap-2"
        >
          {CONDITION_INFO.map((c) => (
            <Chip
              key={c.value}
              size="sm"
              dot={c.tier ? TIER_META[c.tier].dot : undefined}
              selected={values.conditions.includes(c.value)}
              onClick={() => toggle(c.value)}
              title={c.hint}
            >
              {c.label}
              {c.tier ? <span className="sr-only"> ({TIER_META[c.tier].sr})</span> : null}
            </Chip>
          ))}
        </div>
        <FieldError id={errorId}>{errors.conditions}</FieldError>
        {contraindications.length + precautions.length > 0 ? (
          <div
            role="note"
            className={cn(
              "mt-4 flex animate-fade-in items-start gap-3 rounded-panel px-4 py-3.5 text-[14px] text-ink-2",
              contraindications.length > 0 ? "bg-danger-50" : "bg-warning-50",
            )}
          >
            <TriangleAlert
              aria-hidden
              className={cn("mt-0.5 size-[18px] shrink-0", contraindications.length > 0 ? "text-danger" : "text-warning")}
              strokeWidth={2}
            />
            <div className="min-w-0 space-y-1">
              {contraindications.length > 0 ? (
                <p>
                  <span className="font-medium text-danger">Contraindicación a considerar: </span>
                  {contraindications.map((c) => c.label).join(" · ")}.
                </p>
              ) : null}
              {precautions.length > 0 ? (
                <p>
                  <span className="font-medium text-warning">Requiere precaución: </span>
                  {precautions.map((c) => c.label).join(" · ")}.
                </p>
              ) : null}
              {withHints.length > 0 ? (
                <ul className="space-y-0.5 text-[13px]">
                  {withHints.map((c) => (
                    <li key={c.value}>
                      <span className="font-medium text-ink">{c.label}:</span> {c.hint}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-[13px] text-muted">
                Revisá la sección de alertas antes de indicar agentes físicos o terapia manual. La lista es orientativa
                y no reemplaza el criterio profesional.
              </p>
            </div>
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
  const { contraindications, precautions } = selectedAlerts(values.conditions);
  const fromHistory = [...contraindications, ...precautions];
  const hasFlags = values.red_flags.trim() !== "";
  const tone = hasFlags || contraindications.length > 0 ? "danger" : precautions.length > 0 ? "warning" : "none";

  return (
    <div
      className={cn(
        "rounded-panel p-4 transition-colors sm:p-6",
        tone === "danger" ? "bg-danger-50" : tone === "warning" ? "bg-warning-50" : "bg-surface-2",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
            tone === "danger"
              ? "bg-danger text-white"
              : tone === "warning"
                ? "bg-warning text-white"
                : "bg-surface text-ink-2 shadow-inset",
          )}
        >
          <ShieldAlert className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <label htmlFor="hc-red-flags" className="text-[15px] font-medium text-ink">
            Banderas rojas y contraindicaciones
          </label>
          <p id="hc-red-flags-hint" className="mt-0.5 text-sm text-muted">
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
        aria-describedby={errors.red_flags ? "hc-red-flags-error hc-red-flags-hint" : "hc-red-flags-hint"}
        className="mt-4 max-h-[28rem] min-h-28 w-full resize-y rounded-field [field-sizing:content] bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink shadow-inset outline-none placeholder:text-subtle focus:shadow-[0_0_0_1.5px_var(--color-ink)] focus-visible:outline-none aria-[invalid=true]:shadow-[0_0_0_1.5px_var(--color-danger)]"
      />
      <div className="mt-1.5 flex justify-end">
        <CharCount value={values.red_flags} max={4000} />
      </div>
      <FieldError id="hc-red-flags-error">{errors.red_flags}</FieldError>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">Desde antecedentes:</span>
        {fromHistory.length > 0 ? (
          fromHistory.map((c) => (
            <span
              key={c.value}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium text-ink-2 shadow-inset"
            >
              {c.tier ? <TierDot tier={c.tier} /> : null}
              {c.label}
              {c.tier === "precaution" ? <span className="font-normal text-muted">· precaución</span> : null}
            </span>
          ))
        ) : (
          <span className="text-[13px] text-muted">sin condiciones de riesgo marcadas</span>
        )}
      </div>
    </div>
  );
}
