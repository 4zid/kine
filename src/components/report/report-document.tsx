import { ArrowRight, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, PainBadge } from "@/components/ui/badge";
import { DecorCircles } from "@/components/ui/decor";
import { LogoMark } from "@/components/ui/logo";
import { ATTENDANCE, PAIN_FREQUENCY, PAIN_STATUS, PAIN_TYPES } from "@/lib/constants";
import { getRegionLabel } from "@/lib/body-regions";
import type { Attendance, ClinicalHistory, Patient, PainStatus, Professional, TreatmentSession } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PainBarsChart, PainLegend } from "@/components/sessions/pain-bars-chart";
import { PainChange } from "@/components/sessions/session-card";
import {
  compareSessionsAsc,
  computeSessionStats,
  diffDays,
  durationLabel,
  formatScore,
  fullDate,
  improvementText,
  plural,
  shortDate,
  techniqueColor,
  techniqueLabel,
  toHHMM,
  dayParts,
} from "@/components/sessions/session-utils";
import {
  ageOn,
  conditionMeta,
  documentLabel,
  gradeLabel,
  licenseLabel,
  parseFunctionalScales,
  parseMuscleStrength,
  parseRangeOfMotion,
  parseSpecialTests,
  rangeTitle,
  sideLabel,
  specialtyLabels,
  techniqueCounts,
  TEST_RESULTS,
  type ReportPeriod,
} from "@/components/report/report-utils";

export type ReportProfessional = Pick<
  Professional,
  | "first_name"
  | "last_name"
  | "license_type"
  | "license_number"
  | "license_province"
  | "specialties"
  | "clinic_name"
  | "clinic_address"
  | "city"
  | "province"
  | "phone"
  | "email"
>;

export type ReportPatient = Pick<
  Patient,
  | "first_name"
  | "last_name"
  | "birth_date"
  | "document_type"
  | "document_number"
  | "health_insurance"
  | "health_insurance_plan"
  | "health_insurance_number"
  | "referring_doctor"
  | "occupation"
  | "consultation_reason"
  | "medical_diagnosis"
  | "kinesic_diagnosis"
  | "onset_date"
  | "injury_mechanism"
>;

export type ReportSession = Pick<
  TreatmentSession,
  | "id"
  | "session_date"
  | "start_time"
  | "duration_minutes"
  | "attendance"
  | "techniques"
  | "pain_before"
  | "pain_after"
  | "subjective"
  | "objective"
  | "assessment"
  | "plan"
  | "home_exercises"
  | "created_at"
>;

export type ReportPainZone = {
  id: string;
  region: string;
  intensity: number;
  status: string;
  pain_types: string[];
  frequency: string | null;
};

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------
function Block({
  title,
  description,
  action,
  children,
  breakable = false,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** Bloques largos: pueden partirse entre páginas (sus ítems internos no se cortan). */
  breakable?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-card bg-surface p-6 sm:p-7 print:rounded-[14px] print:border print:border-line print:p-[18px]",
        breakable ? "break-inside-auto" : "break-inside-avoid",
        className,
      )}
    >
      {title ? (
        <div className="mb-5 flex break-after-avoid flex-wrap items-start justify-between gap-x-4 gap-y-2 print:mb-3">
          <div className="min-w-0">
            <h3 className="display text-[22px] font-medium text-ink print:text-[16px]">{title}</h3>
            {description ? <p className="mt-1 text-sm text-muted print:text-[11px]">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-medium tracking-[0.14em] text-subtle uppercase print:text-[9px]", className)}>
      {children}
    </p>
  );
}

type Info = { label: string; value: ReactNode };

function InfoGrid({ items, className }: { items: Info[]; className?: string }) {
  const visible = items.filter((i) => i.value != null && i.value !== "" && i.value !== false);
  if (visible.length === 0) return null;
  return (
    <dl className={cn("grid gap-x-6 gap-y-3.5 sm:grid-cols-2 print:grid-cols-2 print:gap-y-2", className)}>
      {visible.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-[12px] text-muted print:text-[10px]">{i.label}</dt>
          <dd className="mt-0.5 text-[15px] break-words text-ink print:text-[12px]">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TextItem({ label, text, className }: { label: string; text: string | null | undefined; className?: string }) {
  const t = text?.trim();
  if (!t) return null;
  return (
    <div className={cn("min-w-0 break-inside-avoid", className)}>
      <p className="text-[12px] text-muted print:text-[10px]">{label}</p>
      <p className="mt-1 text-[15px] leading-relaxed break-words whitespace-pre-line text-ink print:text-[12px] print:leading-snug">
        {t}
      </p>
    </div>
  );
}

function Table({ head, rows, className }: { head: string[]; rows: ReactNode[][]; className?: string }) {
  return (
    <div className={cn("-mx-1 overflow-x-auto print:mx-0 print:overflow-visible", className)}>
      <table className="w-full min-w-[460px] border-collapse text-left text-[14px] print:min-w-0 print:text-[11px]">
        <thead>
          <tr className="border-b border-line">
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-1 pb-2 text-[12px] font-medium text-muted print:pb-1 print:text-[10px]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/70 last:border-0">
              {r.map((c, j) => (
                <td key={j} className="px-1 py-2 align-top text-ink-2 print:py-1">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubTitle({ children }: { children: ReactNode }) {
  return <h4 className="mb-2 text-[15px] font-medium text-ink print:mb-1 print:text-[12px]">{children}</h4>;
}

const deg = (v: number | null) => (v == null ? "—" : `${v}°`);

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

/**
 * Informe kinésico imprimible (A4). Presentacional: recibe todo ya leído y filtrado por período.
 * `bodyMap` es un hueco para la figura del mapa corporal (BodyMapPreview, otro módulo).
 */
export function ReportDocument({
  today,
  period,
  professional,
  patient,
  history,
  sessions,
  painZones,
  bodyMap,
}: {
  today: string;
  period: ReportPeriod;
  professional: ReportProfessional;
  patient: ReportPatient;
  history: ClinicalHistory | null;
  /** Sesiones del período con fecha ≤ hoy. */
  sessions: ReportSession[];
  /** Zonas con dolor actual (último registro por zona, sin resueltas). */
  painZones: ReportPainZone[];
  bodyMap?: ReactNode;
}) {
  const stats = computeSessionStats(sessions, period.to, history?.prescribed_sessions ?? null);
  const evolution = [...sessions].sort((a, b) => compareSessionsAsc(b, a));
  const techniques = techniqueCounts(sessions);
  const maxTechnique = techniques[0]?.count ?? 1;

  const from = period.from ?? stats.firstDate ?? period.to;
  const to = period.kind === "todo" ? (stats.lastDate ?? period.to) : period.to;
  const range = rangeTitle(from, to);

  const name = `${patient.first_name} ${patient.last_name}`.trim();
  const proName = `Lic. ${[professional.first_name, professional.last_name].filter(Boolean).join(" ") || "—"}`;
  const license = licenseLabel(professional);
  const specialties = specialtyLabels(professional.specialties);
  const age = ageOn(patient.birth_date, today);
  const insurance = [patient.health_insurance, patient.health_insurance_plan].filter(Boolean).join(" ");
  const place = [
    professional.city,
    professional.province && professional.province !== professional.city ? professional.province : null,
  ]
    .filter(Boolean)
    .join(", ");

  const conditions = (history?.conditions ?? []).map(conditionMeta);
  const alertConditions = conditions.filter((c) => c.alert);
  const otherConditions = conditions.filter((c) => !c.alert);
  const allergies = history?.allergies?.trim();
  const redFlags = history?.red_flags?.trim();
  const hasAlerts = alertConditions.length > 0 || Boolean(allergies) || Boolean(redFlags);
  const background: [string, string | null | undefined][] = [
    ["Observaciones de antecedentes", history?.conditions_notes],
    ["Cirugías", history?.surgeries],
    ["Fracturas", history?.fractures],
    ["Medicación", history?.medications],
    ["Antecedentes familiares", history?.family_history],
    ["Tratamientos previos", history?.previous_treatments],
  ];
  const hasBackground = otherConditions.length > 0 || background.some(([, v]) => v?.trim());

  const rom = parseRangeOfMotion(history?.range_of_motion);
  const strength = parseMuscleStrength(history?.muscle_strength);
  const tests = parseSpecialTests(history?.special_tests);
  const scales = parseFunctionalScales(history?.functional_scales);
  const bmi =
    history?.height_cm && history?.weight_kg ? history.weight_kg / Math.pow(history.height_cm / 100, 2) : null;
  const vitals: Info[] = [
    { label: "Talla", value: history?.height_cm ? `${formatScore(history.height_cm)} cm` : null },
    { label: "Peso", value: history?.weight_kg ? `${formatScore(history.weight_kg)} kg` : null },
    { label: "IMC", value: bmi ? formatScore(bmi) : null },
    { label: "Tensión arterial", value: history?.blood_pressure ? `${history.blood_pressure} mmHg` : null },
    { label: "Frecuencia cardíaca", value: history?.heart_rate ? `${history.heart_rate} lpm` : null },
    { label: "Saturación O₂", value: history?.oxygen_saturation ? `${history.oxygen_saturation} %` : null },
  ].filter((v) => v.value);
  const examTexts: [string, string | null | undefined][] = [
    ["Postura", history?.posture_assessment],
    ["Marcha", history?.gait_assessment],
    ["Palpación", history?.palpation],
  ];
  const hasEvaluation =
    rom.length + strength.length + tests.length + scales.length + vitals.length > 0 ||
    examTexts.some(([, v]) => v?.trim());

  const hasPlan = Boolean(
    history?.short_term_goals?.trim() ||
    history?.long_term_goals?.trim() ||
    history?.treatment_plan?.trim() ||
    history?.prescribed_sessions ||
    history?.session_frequency?.trim(),
  );

  const onset = patient.onset_date
    ? `${fullDate(patient.onset_date)}${diffDays(patient.onset_date, today) >= 0 ? ` (${weeksAgo(diffDays(patient.onset_date, today))})` : ""}`
    : null;

  return (
    <article
      aria-label={`Informe kinésico de ${name}`}
      className="flex flex-col gap-5 [print-color-adjust:exact] [-webkit-print-color-adjust:exact] print:gap-3.5 print:text-[12px]"
    >
      {/* Título (como "Informe semanal · Martina Ruiz · Semana 41" / "5 – 11 oct 2026") */}
      <header className="break-inside-avoid pt-2 print:pt-0">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[15px] text-muted print:text-[12px] [&_strong]:font-medium [&_strong]:text-ink">
            Informe kinésico · <strong>{name}</strong> · {plural(stats.attended, "sesión", "sesiones")}
          </p>
          <span className="hidden items-center gap-2 print:inline-flex">
            <LogoMark className="size-6" />
            <span className="display text-[16px] font-medium">kine</span>
          </span>
        </div>
        <h2 className="display mt-2 text-[40px] font-normal text-ink sm:text-[56px] print:mt-1 print:text-[34px]">
          {range.main} <span className="text-muted">{range.year}</span>
        </h2>
      </header>

      {/* Profesional y paciente */}
      <div className="grid gap-5 md:grid-cols-2 print:grid-cols-2 print:gap-3.5">
        <Block>
          <Eyebrow>Profesional</Eyebrow>
          <p className="display mt-2 text-[26px] font-medium text-ink print:mt-1 print:text-[18px]">{proName}</p>
          <p className="mt-1 text-[15px] text-muted print:text-[12px]">
            Kinesiología y Fisiatría{license ? ` · ${license}` : ""}
          </p>
          {specialties.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-1.5 print:mt-2" aria-label="Especialidades">
              {specialties.map((s) => (
                <li key={s}>
                  <Badge className="h-7 print:h-5 print:px-2 print:text-[10px]">{s}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
          <InfoGrid
            className="mt-5 print:mt-3"
            items={[
              { label: "Consultorio", value: professional.clinic_name },
              { label: "Dirección", value: [professional.clinic_address, place].filter(Boolean).join(" · ") || null },
              { label: "Teléfono", value: professional.phone },
              { label: "Email", value: professional.email || null },
            ]}
          />
        </Block>

        <Block>
          <Eyebrow>Paciente</Eyebrow>
          <p className="display mt-2 text-[26px] font-medium text-ink print:mt-1 print:text-[18px]">{name}</p>
          <p className="mt-1 text-[15px] text-muted print:text-[12px]">
            {[age != null ? `${age} años` : null, patient.occupation].filter(Boolean).join(" · ") || "Datos personales"}
          </p>
          <InfoGrid
            className="mt-5 print:mt-3"
            items={[
              { label: "Documento", value: documentLabel(patient.document_type, patient.document_number) },
              { label: "Fecha de nacimiento", value: patient.birth_date ? fullDate(patient.birth_date) : null },
              { label: "Obra social / prepaga", value: insurance || null },
              { label: "N.º de afiliado", value: patient.health_insurance_number },
              { label: "Médico derivante", value: patient.referring_doctor },
            ]}
          />
        </Block>
      </div>

      {/* Consulta y diagnóstico */}
      {patient.consultation_reason || patient.medical_diagnosis || patient.kinesic_diagnosis || onset ? (
        <Block title="Motivo de consulta y diagnóstico">
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2 print:grid-cols-2 print:gap-y-3">
            <TextItem
              label="Motivo de consulta"
              text={patient.consultation_reason}
              className="md:col-span-2 print:col-span-2"
            />
            <TextItem label="Diagnóstico médico" text={patient.medical_diagnosis} />
            <TextItem label="Diagnóstico kinésico funcional" text={patient.kinesic_diagnosis} />
            <TextItem label="Inicio de síntomas" text={onset} />
            <TextItem label="Mecanismo de lesión" text={patient.injury_mechanism} />
          </div>
        </Block>
      ) : null}

      {/* Antecedentes y alertas */}
      {hasAlerts || hasBackground ? (
        <Block title="Antecedentes relevantes" breakable>
          {hasAlerts ? (
            <div className="mb-5 break-inside-avoid rounded-panel bg-warning-50 p-4 shadow-[inset_0_0_0_1px_rgb(183_121_31/0.2)] print:mb-3 print:p-3">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-warning print:text-[11px]">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-warning text-white print:size-4">
                  <TriangleAlert className="size-3.5 print:size-2.5" aria-hidden />
                </span>
                Alertas y contraindicaciones
              </p>
              {alertConditions.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5 print:mt-2" aria-label="Antecedentes con alerta">
                  {alertConditions.map((c) => (
                    <li key={c.label}>
                      <Badge dot="#B7791F" tone="white" className="h-7 print:h-5 print:text-[10px]">
                        {c.label}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 grid gap-3 sm:grid-cols-2 print:mt-2 print:grid-cols-2 print:gap-2">
                <TextItem label="Alergias" text={allergies} />
                <TextItem label="Banderas rojas" text={redFlags} />
              </div>
            </div>
          ) : null}
          {otherConditions.length > 0 ? (
            <ul className="mb-5 flex flex-wrap gap-1.5 print:mb-3" aria-label="Antecedentes patológicos">
              {otherConditions.map((c) => (
                <li key={c.label}>
                  <Badge className="h-7 print:h-5 print:text-[10px]">{c.label}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-2 print:grid-cols-2 print:gap-y-2.5">
            {background.map(([label, text]) => (
              <TextItem key={label} label={label} text={text} />
            ))}
          </div>
        </Block>
      ) : null}

      {/* Resumen + dolor por sesión */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] print:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] print:gap-3.5">
        <section
          aria-label="Resumen del período"
          className="relative flex min-w-0 break-inside-avoid flex-col overflow-hidden rounded-card bg-accent p-6 text-white sm:p-7 print:rounded-[14px] print:p-[18px]"
        >
          <DecorCircles className="text-white" variant="a" />
          <span className="relative inline-flex h-9 items-center self-start rounded-full px-4 text-sm font-medium shadow-[inset_0_0_0_1px_rgb(255_255_255/0.6)] print:h-6 print:px-3 print:text-[11px]">
            Resumen del período
          </span>
          <div className="relative mt-8 flex items-end gap-3 print:mt-4">
            <div>
              <p className="text-sm text-white/75 print:text-[11px]">EVA inicial</p>
              <p className="display mt-1">
                <span className="text-[52px] leading-none print:text-[34px]">{stats.initialPain ?? "—"}</span>
                <span className="text-base text-white/70 print:text-[12px]">/10</span>
              </p>
            </div>
            <ArrowRight className="mb-3 size-6 shrink-0 text-white/60 print:mb-2 print:size-4" aria-hidden />
            <div>
              <p className="text-sm text-white/75 print:text-[11px]">EVA actual</p>
              <p className="display mt-1">
                <span className="text-[52px] leading-none print:text-[34px]">{stats.latestPain ?? "—"}</span>
                <span className="text-base text-white/70 print:text-[12px]">/10</span>
              </p>
            </div>
          </div>
          <p className="relative mt-3 text-[17px] font-medium print:mt-2 print:text-[13px]">
            {improvementText(stats.improvementPct) ?? "Sin registros suficientes para comparar"}
          </p>
          <dl className="relative mt-auto grid grid-cols-2 gap-4 border-t border-white/20 pt-5 print:gap-2 print:pt-3">
            <div>
              <dt className="text-sm text-white/75 print:text-[11px]">Sesiones realizadas</dt>
              <dd className="display mt-0.5 text-[28px] print:text-[20px]">
                {stats.attended}
                {stats.prescribed ? (
                  <span className="text-base text-white/70 print:text-[12px]"> de {stats.prescribed}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-white/75 print:text-[11px]">Asistencia</dt>
              <dd className="display mt-0.5 text-[28px] print:text-[20px]">
                {stats.attendanceRate != null ? `${stats.attendanceRate} %` : "—"}
              </dd>
            </div>
          </dl>
          {stats.absent + stats.cancelled > 0 ? (
            <p className="relative mt-2 text-[13px] text-white/75 print:text-[10px]">
              {[
                stats.absent ? plural(stats.absent, "ausencia", "ausencias") : null,
                stats.cancelled ? plural(stats.cancelled, "cancelada", "canceladas") : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </section>

        <Block
          title="Dolor por sesión"
          description="EVA de 0 a 10 al empezar y al terminar cada sesión."
          action={<PainLegend className="sm:pt-1 print:text-[10px]" />}
          className="flex flex-col"
        >
          <PainBarsChart points={stats.painPoints} className="mt-auto" />
        </Block>
      </div>

      {/* Técnicas + zonas de dolor */}
      <div className="grid gap-5 md:grid-cols-2 print:grid-cols-2 print:gap-3.5">
        <Block
          title="Técnicas más utilizadas"
          description={
            techniques.length ? `En ${plural(stats.attended, "sesión realizada", "sesiones realizadas")}` : undefined
          }
        >
          {techniques.length === 0 ? (
            <p className="text-sm text-muted">No se registraron técnicas en el período.</p>
          ) : (
            <ul className="flex flex-col gap-3 print:gap-1.5">
              {techniques.slice(0, 8).map((t) => (
                <li
                  key={t.value}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 print:gap-y-0.5"
                >
                  <span className="flex min-w-0 items-center gap-2 text-[14px] text-ink print:text-[11px]">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: techniqueColor(t.value) }}
                    />
                    <span className="truncate">{techniqueLabel(t.value)}</span>
                  </span>
                  <span className="tabular text-[13px] text-muted print:text-[10px]">
                    {t.count} <span className="sr-only">sesiones</span>
                  </span>
                  <span aria-hidden className="col-span-2 h-2 overflow-hidden rounded-full bg-surface-2 print:h-1.5">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(6, (t.count / maxTechnique) * 100)}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Zonas de dolor actuales" description="Último registro de cada zona en el mapa corporal.">
          {bodyMap ? <div className="mb-5 print:mb-3">{bodyMap}</div> : null}
          {painZones.length === 0 ? (
            <p className="text-sm text-muted">Sin zonas con dolor activo registradas.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {painZones.map((z) => {
                const status = PAIN_STATUS[z.status as PainStatus];
                const types = z.pain_types.map((t) => PAIN_TYPES.find((p) => p.value === t)?.label ?? t);
                const freq = PAIN_FREQUENCY.find((f) => f.value === z.frequency)?.label;
                return (
                  <li key={z.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0 print:py-1.5">
                    <PainBadge intensity={z.intensity} size="sm" className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-ink print:text-[11.5px]">{getRegionLabel(z.region)}</p>
                      {types.length || freq ? (
                        <p className="text-[13px] text-muted print:text-[10px]">
                          {[types.join(", "), freq].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    {status ? (
                      <Badge dot={status.color} tone="white" className="h-6 px-2 text-xs print:h-5 print:text-[10px]">
                        {status.label}
                      </Badge>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Block>
      </div>

      {/* Evaluación */}
      {hasEvaluation ? (
        <Block title="Evaluación" description="Según la historia clínica." breakable>
          <div className="flex flex-col gap-6 print:gap-3">
            {vitals.length > 0 ? (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6 print:gap-2">
                {vitals.map((v) => (
                  <div
                    key={v.label}
                    className="rounded-2xl bg-surface-2 px-3.5 py-2.5 print:rounded-lg print:px-2 print:py-1.5"
                  >
                    <dt className="text-[12px] text-muted print:text-[9px]">{v.label}</dt>
                    <dd className="tabular mt-0.5 text-[15px] font-medium text-ink print:text-[11px]">{v.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {examTexts.some(([, t]) => t?.trim()) ? (
              <div className="grid gap-x-8 gap-y-4 md:grid-cols-3 print:grid-cols-3 print:gap-y-2">
                {examTexts.map(([label, text]) => (
                  <TextItem key={label} label={label} text={text} />
                ))}
              </div>
            ) : null}
            {rom.length > 0 ? (
              <div className="break-inside-avoid">
                <SubTitle>Rango de movimiento</SubTitle>
                <Table
                  head={["Articulación", "Movimiento", "Lado", "Activo", "Pasivo", "Observaciones"]}
                  rows={rom.map((r) => [
                    r.joint,
                    r.movement,
                    sideLabel(r.side),
                    deg(r.active_deg),
                    deg(r.passive_deg),
                    r.notes ?? "",
                  ])}
                />
              </div>
            ) : null}
            {strength.length > 0 || tests.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-2 print:gap-3">
                {strength.length > 0 ? (
                  <div className="min-w-0 break-inside-avoid">
                    <SubTitle>Fuerza muscular (Daniels)</SubTitle>
                    <Table
                      head={["Músculo", "Lado", "Grado"]}
                      rows={strength.map((m) => [m.muscle, sideLabel(m.side), gradeLabel(m.grade)])}
                    />
                  </div>
                ) : null}
                {tests.length > 0 ? (
                  <div className="min-w-0 break-inside-avoid">
                    <SubTitle>Pruebas especiales</SubTitle>
                    <Table
                      head={["Prueba", "Lado", "Resultado"]}
                      rows={tests.map((t) => [
                        <span key="n">
                          {t.name}
                          {t.notes ? (
                            <span className="block text-[12px] text-muted print:text-[9.5px]">{t.notes}</span>
                          ) : null}
                        </span>,
                        sideLabel(t.side),
                        <span key="r" className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span
                            aria-hidden
                            className="size-2 rounded-full"
                            style={{ backgroundColor: TEST_RESULTS[t.result].color }}
                          />
                          {TEST_RESULTS[t.result].label}
                        </span>,
                      ])}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            {scales.length > 0 ? (
              <div className="break-inside-avoid">
                <SubTitle>Escalas funcionales</SubTitle>
                <Table
                  head={["Escala", "Puntaje", "Fecha"]}
                  rows={scales.map((s) => [
                    s.name,
                    <span key="s" className="tabular">
                      {s.score ?? "—"}
                      {s.max != null ? <span className="text-muted"> / {s.max}</span> : null}
                    </span>,
                    s.date ? shortDate(s.date, true) : "—",
                  ])}
                />
              </div>
            ) : null}
          </div>
        </Block>
      ) : null}

      {/* Objetivos y plan */}
      {hasPlan ? (
        <Block title="Objetivos y plan terapéutico" breakable>
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2 print:grid-cols-2 print:gap-y-3">
            <TextItem label="Objetivos a corto plazo" text={history?.short_term_goals} />
            <TextItem label="Objetivos a largo plazo" text={history?.long_term_goals} />
            <TextItem
              label="Plan de tratamiento"
              text={history?.treatment_plan}
              className="md:col-span-2 print:col-span-2"
            />
            <InfoGrid
              className="md:col-span-2 print:col-span-2"
              items={[
                {
                  label: "Sesiones prescriptas",
                  value: history?.prescribed_sessions ? String(history.prescribed_sessions) : null,
                },
                { label: "Frecuencia", value: history?.session_frequency },
              ]}
            />
          </div>
        </Block>
      ) : null}

      {/* Evolución */}
      <Block
        title="Evolución"
        description={evolution.length ? "Sesiones del período, de la más reciente a la más antigua." : undefined}
        breakable
      >
        {evolution.length === 0 ? (
          <p className="text-sm text-muted">No hay sesiones registradas en el período elegido.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-line">
            {evolution.map((s) => (
              <EvolutionItem key={s.id} session={s} number={stats.numbers[s.id]} />
            ))}
          </ol>
        )}
      </Block>

      {/* Firma */}
      <footer className="mt-4 flex break-inside-avoid flex-col-reverse gap-10 px-1 sm:flex-row sm:items-end sm:justify-between print:mt-8 print:flex-row print:items-end">
        <p className="text-[13px] text-muted print:text-[10px]">
          Informe generado el {fullDate(today)} con kine.
          <br />
          Documento confidencial: contiene datos de salud del paciente.
        </p>
        <div className="w-full max-w-[280px] self-end text-center sm:self-auto print:w-[230px]">
          <div className="h-16 border-b border-ink/60 print:h-14" />
          <p className="mt-2 text-[14px] font-medium text-ink print:text-[11.5px]">{proName}</p>
          {license ? <p className="text-[13px] text-muted print:text-[10.5px]">{license}</p> : null}
          <p className="mt-1 text-[12px] tracking-wide text-subtle uppercase print:text-[9px]">Firma y sello</p>
        </div>
      </footer>
    </article>
  );
}

function weeksAgo(days: number): string {
  if (days < 1) return "hoy";
  if (days < 14) return `hace ${plural(days, "día", "días")}`;
  if (days < 60) return `hace ${Math.round(days / 7)} semanas`;
  const months = Math.round(days / 30);
  return months < 24 ? `hace ${months} meses` : `hace ${Math.round(days / 365)} años`;
}

const SOAP_LABELS = [
  ["subjective", "S"],
  ["objective", "O"],
  ["assessment", "A"],
  ["plan", "P"],
] as const;

function EvolutionItem({ session, number }: { session: ReportSession; number?: number }) {
  const p = dayParts(session.session_date);
  const attended = session.attendance === "attended";
  const status = ATTENDANCE[session.attendance as Attendance] ?? ATTENDANCE.attended;
  const time = toHHMM(session.start_time);
  const soap = SOAP_LABELS.map(([key, letter]) => ({ letter, text: session[key]?.trim() })).filter((s) => s.text);

  return (
    <li className="flex break-inside-avoid gap-4 py-4 first:pt-0 last:pb-0 print:gap-3 print:py-2.5">
      <div className="w-14 shrink-0 text-center print:w-11">
        <p className="text-[12px] text-muted print:text-[9.5px]">{p.weekday}</p>
        <p className="display tabular text-[26px] leading-none text-ink print:text-[18px]">{p.day}</p>
        <p className="text-[11px] text-subtle print:text-[9px]">
          {p.month} {String(p.year).slice(2)}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {number ? (
            <span className="text-[14px] font-medium text-ink print:text-[11.5px]">Sesión {number}</span>
          ) : null}
          {time || session.duration_minutes ? (
            <span className="tabular text-[13px] text-muted print:text-[10.5px]">
              {[time, durationLabel(session.duration_minutes)].filter(Boolean).join(" · ")}
            </span>
          ) : null}
          {!attended ? (
            <Badge dot={status.color} tone="white" className="h-6 px-2 text-xs print:h-5 print:text-[10px]">
              {status.label}
            </Badge>
          ) : null}
          {attended ? <PainChange before={session.pain_before} after={session.pain_after} className="ml-auto" /> : null}
        </div>
        {attended && (session.techniques ?? []).length > 0 ? (
          <p className="mt-1.5 text-[13px] text-ink-2 print:mt-1 print:text-[10.5px]">
            <span className="text-muted">Técnicas: </span>
            {(session.techniques ?? []).map(techniqueLabel).join(", ")}
          </p>
        ) : null}
        {attended && soap.length > 0 ? (
          <dl className="mt-2 flex flex-col gap-1 print:mt-1 print:gap-0.5">
            {soap.map((s) => (
              <div
                key={s.letter}
                className="flex gap-2 text-[14px] leading-relaxed print:text-[11px] print:leading-snug"
              >
                <dt className="display w-4 shrink-0 font-semibold text-ink">{s.letter}</dt>
                <dd className="min-w-0 break-words whitespace-pre-line text-ink-2">{s.text}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {attended && session.home_exercises?.trim() ? (
          <div className="mt-2 text-[13px] text-ink-2 print:mt-1 print:text-[10.5px]">
            <p className="text-muted">Ejercicios para casa</p>
            <p className="mt-0.5 break-words whitespace-pre-line">{session.home_exercises.trim()}</p>
          </div>
        ) : null}
      </div>
    </li>
  );
}
