"use client";

import { DecorCircles } from "@/components/ui/decor";
import { GroupLabel, TextAreaField, VitalTile } from "@/components/clinical-history/fields";
import { computeBmi, type BmiCategory } from "@/components/clinical-history/schema";
import type { FieldSectionProps } from "@/components/clinical-history/types";
import { cn, formatDecimal } from "@/lib/utils";

const BMI_SEGMENTS: { tone: BmiCategory["tone"]; label: string; from: number; to: number }[] = [
  { tone: "low", label: "Bajo peso", from: 15, to: 18.5 },
  { tone: "normal", label: "Normal", from: 18.5, to: 25 },
  { tone: "over", label: "Sobrepeso", from: 25, to: 30 },
  { tone: "obese", label: "Obesidad", from: 30, to: 40 },
];
const BMI_MIN = 15;
const BMI_MAX = 40;

function BmiCard({ height, weight }: { height: string; weight: string }) {
  const bmi = computeBmi(height, weight);
  const markerPct = bmi
    ? ((Math.min(BMI_MAX, Math.max(BMI_MIN, bmi.value)) - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100
    : null;

  return (
    <div
      className="relative col-span-2 flex min-h-[132px] flex-col justify-between overflow-hidden rounded-panel bg-accent p-4 text-white sm:p-5"
      aria-live="polite"
    >
      <DecorCircles variant="c" className="text-white/60" />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-white/75">IMC · índice de masa corporal</p>
        {bmi ? (
          <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-white px-3 text-[13px] font-semibold text-accent-900">
            {bmi.category.label}
          </span>
        ) : null}
      </div>
      <div className="relative mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <p className="display tabular">
          <span className="text-[44px] font-medium sm:text-[52px]">{bmi ? formatDecimal(bmi.value) : "—"}</span>
          <span className="ml-1 text-base text-white/70">kg/m²</span>
        </p>
        {bmi && markerPct != null ? (
          <div className="w-full max-w-[260px] pb-2" aria-hidden>
            <div className="relative flex gap-1">
              {BMI_SEGMENTS.map((s) => (
                <span
                  key={s.tone}
                  className={cn("h-1.5 rounded-full", s.tone === bmi.category.tone ? "bg-white" : "bg-white/30")}
                  style={{ flex: s.to - s.from }}
                />
              ))}
              <span
                className="absolute -top-[5px] size-4 -translate-x-1/2 rounded-full border-[3px] border-accent bg-white shadow-soft"
                style={{ left: `${markerPct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-white/60">
              <span>15</span>
              <span>18,5</span>
              <span>25</span>
              <span>30</span>
              <span>40+</span>
            </div>
          </div>
        ) : (
          <p className="pb-2 text-sm text-white/75">Completá talla y peso para calcularlo.</p>
        )}
      </div>
    </div>
  );
}

export function ExamSection({ values, errors, set }: FieldSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <GroupLabel hint="Podés usar coma decimal: 72,5">Signos vitales y antropometría</GroupLabel>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <VitalTile
            label="Talla"
            unit="cm"
            value={values.height_cm}
            onChange={(v) => set("height_cm", v)}
            error={errors.height_cm}
            placeholder="—"
          />
          <VitalTile
            label="Peso"
            unit="kg"
            value={values.weight_kg}
            onChange={(v) => set("weight_kg", v)}
            error={errors.weight_kg}
            placeholder="—"
          />
          <BmiCard height={values.height_cm} weight={values.weight_kg} />
          <VitalTile
            label="Tensión arterial"
            unit="mmHg"
            inputMode="text"
            maxLength={9}
            value={values.blood_pressure}
            onChange={(v) => set("blood_pressure", v)}
            error={errors.blood_pressure}
            placeholder="—/—"
          />
          <VitalTile
            label="Frec. cardíaca"
            unit="lpm"
            inputMode="numeric"
            maxLength={3}
            value={values.heart_rate}
            onChange={(v) => set("heart_rate", v)}
            error={errors.heart_rate}
            placeholder="—"
          />
          <VitalTile
            label="Frec. respiratoria"
            unit="rpm"
            inputMode="numeric"
            maxLength={2}
            value={values.respiratory_rate}
            onChange={(v) => set("respiratory_rate", v)}
            error={errors.respiratory_rate}
            placeholder="—"
          />
          <VitalTile
            label="Saturación O₂"
            unit="%"
            inputMode="numeric"
            maxLength={3}
            value={values.oxygen_saturation}
            onChange={(v) => set("oxygen_saturation", v)}
            error={errors.oxygen_saturation}
            placeholder="—"
          />
        </div>
      </div>

      <TextAreaField
        label="Evaluación postural"
        placeholder="Vista anterior, lateral y posterior: alineación, asimetrías, curvaturas…"
        rows={4}
        value={values.posture_assessment}
        onChange={(v) => set("posture_assessment", v)}
        max={4000}
        error={errors.posture_assessment}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextAreaField
          label="Marcha"
          placeholder="Patrón, apoyo, uso de ayudas técnicas, claudicación…"
          value={values.gait_assessment}
          onChange={(v) => set("gait_assessment", v)}
          max={4000}
          error={errors.gait_assessment}
        />
        <TextAreaField
          label="Palpación"
          placeholder="Puntos gatillo, contracturas, temperatura, edema, sensibilidad…"
          value={values.palpation}
          onChange={(v) => set("palpation", v)}
          max={4000}
          error={errors.palpation}
        />
      </div>
    </div>
  );
}
