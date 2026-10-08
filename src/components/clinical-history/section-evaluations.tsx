"use client";

import { Activity, ClipboardList, Dumbbell, Ruler } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { FieldError, MiniField, SideSelect } from "@/components/clinical-history/fields";
import { RowList } from "@/components/clinical-history/row-list";
import {
  GRADES,
  TEST_RESULTS,
  newRomRow,
  newScaleRow,
  newStrengthRow,
  newTestRow,
  parseLocaleNumber,
  rowErrorKey,
  type Grade,
  type TestResult,
} from "@/components/clinical-history/schema";
import {
  JOINT_SUGGESTIONS,
  MOVEMENT_SUGGESTIONS,
  MUSCLE_SUGGESTIONS,
  romReference,
  scaleMaxFor,
} from "@/components/clinical-history/catalog";
import type { RowSectionProps } from "@/components/clinical-history/types";
import { FUNCTIONAL_SCALE_SUGGESTIONS, MUSCLE_GRADES, SPECIAL_TEST_SUGGESTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/*
 * Cada fila usa grid-template-areas con container queries:
 *  - angosto (mobile): campos apilados en 3-4 líneas;
 *  - medio (@lg): 2 líneas;
 *  - ancho: una sola línea tipo tabla (los envoltorios de línea pasan a `contents`).
 */

function Datalist({ id, options }: { id: string; options: readonly string[] }) {
  return (
    <datalist id={id}>
      {options.map((o) => (
        <option key={o} value={o} />
      ))}
    </datalist>
  );
}

const pct = (value: number, max: number) => Math.max(0, Math.min(100, Math.round((value / max) * 100)));

// ---------------------------------------------------------------------------
// 5 · Rango de movimiento
// ---------------------------------------------------------------------------
export function RangeOfMotionSection({ rows, errors, onRowsChange, patch }: RowSectionProps<"range_of_motion">) {
  const err = (id: string, f: string) => errors[rowErrorKey("range_of_motion", id, f)];
  return (
    <>
      <Datalist id="hc-joints" options={JOINT_SUGGESTIONS} />
      <Datalist id="hc-movements" options={MOVEMENT_SUGGESTIONS} />
      <RowList
        rows={rows}
        onRowsChange={onRowsChange}
        createRow={newRomRow}
        addLabel="Agregar medición"
        noun={{ one: "medición", many: "mediciones", removed: "Quitaste una medición" }}
        icon={<Ruler />}
        empty={{
          title: "Sin mediciones todavía",
          description:
            "Registrá el rango activo y pasivo de cada movimiento. Cada fila nueva repite la articulación anterior.",
        }}
        error={errors.range_of_motion}
        renderRow={({ row, remove, isNew }) => {
          const ref = romReference(row.joint, row.movement);
          const active = parseLocaleNumber(row.active_deg);
          const passive = parseLocaleNumber(row.passive_deg);
          return (
            <div className="grid gap-2 @min-[820px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_128px_88px_88px_minmax(0,1fr)_40px] @min-[820px]:items-start @min-[820px]:[grid-template-areas:'joint_move_side_act_pas_notes_del']">
              <div className="grid grid-cols-[minmax(0,1fr)_96px_40px] gap-2 [grid-template-areas:'joint_joint_del'_'move_side_side'] @lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_128px_40px] @lg:[grid-template-areas:'joint_move_side_del'] @min-[820px]:contents">
                <MiniField
                  label="Articulación"
                  list="hc-joints"
                  placeholder="Hombro"
                  maxLength={80}
                  autoFocus={isNew && row.joint === ""}
                  value={row.joint}
                  onChange={(e) => patch(row.id, { joint: e.target.value })}
                  error={err(row.id, "joint")}
                  className="[grid-area:joint]"
                />
                <div className="flex justify-end [grid-area:del]">{remove}</div>
                <MiniField
                  label="Movimiento"
                  list="hc-movements"
                  placeholder="Flexión"
                  maxLength={80}
                  autoFocus={isNew && row.joint !== ""}
                  value={row.movement}
                  onChange={(e) => patch(row.id, { movement: e.target.value })}
                  error={err(row.id, "movement")}
                  className="[grid-area:move]"
                />
                <SideSelect
                  className="[grid-area:side]"
                  value={row.side}
                  onChange={(side) => patch(row.id, { side })}
                  error={err(row.id, "side")}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 [grid-template-areas:'act_pas'_'notes_notes'] @lg:grid-cols-[96px_96px_minmax(0,1fr)] @lg:[grid-template-areas:'act_pas_notes'] @min-[820px]:contents">
                <MiniField
                  label="Activo"
                  inputMode="decimal"
                  placeholder="—"
                  suffix="°"
                  maxLength={6}
                  value={row.active_deg}
                  onChange={(e) => patch(row.id, { active_deg: e.target.value })}
                  error={err(row.id, "active_deg")}
                  className="[grid-area:act]"
                  inputClassName="tabular"
                />
                <MiniField
                  label="Pasivo"
                  inputMode="decimal"
                  placeholder="—"
                  suffix="°"
                  maxLength={6}
                  value={row.passive_deg}
                  onChange={(e) => patch(row.id, { passive_deg: e.target.value })}
                  error={err(row.id, "passive_deg")}
                  className="[grid-area:pas]"
                  inputClassName="tabular"
                />
                <MiniField
                  label="Notas"
                  placeholder="Opcional"
                  maxLength={300}
                  value={row.notes}
                  onChange={(e) => patch(row.id, { notes: e.target.value })}
                  error={err(row.id, "notes")}
                  className="[grid-area:notes]"
                />
              </div>
              {ref ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 pt-0.5 text-[12px] text-muted @min-[820px]:col-span-full">
                  <span>
                    Referencia AAOS <span className="tabular font-medium text-ink-2">0–{ref}°</span>
                  </span>
                  {active != null ? (
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="relative h-1.5 w-24 overflow-hidden rounded-full bg-line">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-300"
                          style={{ width: `${pct(active, ref)}%` }}
                        />
                      </span>
                      <span className="tabular">activo {pct(active, ref)}%</span>
                    </span>
                  ) : null}
                  {passive != null ? <span className="tabular">· pasivo {pct(passive, ref)}%</span> : null}
                </div>
              ) : null}
            </div>
          );
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 6 · Fuerza muscular (Daniels)
// ---------------------------------------------------------------------------
const GRADE_LABEL = new Map<number, string>(MUSCLE_GRADES.map((g) => [g.value, g.label]));

function GradePicker({
  value,
  onChange,
  error,
  label,
  className,
}: {
  value: Grade | null;
  onChange: (grade: Grade) => void;
  error?: string | null;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIndex = value ?? 0;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(5, index + delta)) as Grade;
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div className={cn("shrink-0", className)}>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "flex h-[54px] items-center gap-1 rounded-[14px] bg-surface px-1.5 shadow-inset",
          error && "shadow-[0_0_0_1.5px_var(--color-danger)]",
        )}
      >
        {GRADES.map((g) => {
          const active = value === g;
          const below = value != null && g < value;
          return (
            <button
              key={g}
              ref={(el) => {
                refs.current[g] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={GRADE_LABEL.get(g)}
              title={GRADE_LABEL.get(g)}
              tabIndex={g === focusIndex ? 0 : -1}
              onClick={() => onChange(g)}
              onKeyDown={(e) => onKeyDown(e, g)}
              className={cn(
                "tabular inline-flex size-10 items-center justify-center rounded-[11px] text-[15px] font-semibold transition-[background-color,color,transform] duration-150 active:scale-95",
                active
                  ? "bg-ink text-white"
                  : below
                    ? "bg-surface-3 text-ink"
                    : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {g}
            </button>
          );
        })}
      </div>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <p className="mt-1 px-1 text-[12px] text-muted" aria-live="polite">
          {value != null ? GRADE_LABEL.get(value) : "Elegí un grado"}
        </p>
      )}
    </div>
  );
}

export function StrengthSection({ rows, errors, onRowsChange, patch }: RowSectionProps<"muscle_strength">) {
  const err = (id: string, f: string) => errors[rowErrorKey("muscle_strength", id, f)];
  return (
    <>
      <Datalist id="hc-muscles" options={MUSCLE_SUGGESTIONS} />
      <RowList
        rows={rows}
        onRowsChange={onRowsChange}
        createRow={newStrengthRow}
        addLabel="Agregar músculo"
        noun={{ one: "registro", many: "registros", removed: "Quitaste un registro de fuerza" }}
        icon={<Dumbbell />}
        empty={{
          title: "Sin registros de fuerza",
          description: "Calificá cada músculo o grupo muscular de 0 (sin contracción) a 5 (fuerza normal).",
        }}
        error={errors.muscle_strength}
        renderRow={({ row, remove, isNew }) => (
          <div className="grid gap-2 @2xl:grid-cols-[minmax(0,1fr)_128px_auto_40px] @2xl:items-start @2xl:[grid-template-areas:'muscle_side_grade_del']">
            <div className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 [grid-template-areas:'muscle_del'] @2xl:contents">
              <MiniField
                label="Músculo o grupo muscular"
                list="hc-muscles"
                placeholder="Cuádriceps"
                maxLength={80}
                autoFocus={isNew}
                value={row.muscle}
                onChange={(e) => patch(row.id, { muscle: e.target.value })}
                error={err(row.id, "muscle")}
                className="[grid-area:muscle]"
              />
              <div className="flex justify-end [grid-area:del]">{remove}</div>
            </div>
            <div className="flex flex-wrap items-start gap-2 @2xl:contents">
              <SideSelect
                className="w-[128px] [grid-area:side] @2xl:w-auto"
                value={row.side}
                onChange={(side) => patch(row.id, { side })}
                error={err(row.id, "side")}
              />
              <GradePicker
                className="[grid-area:grade]"
                label={`Grado de fuerza${row.muscle ? ` · ${row.muscle}` : ""}`}
                value={row.grade}
                onChange={(grade) => patch(row.id, { grade })}
                error={err(row.id, "grade")}
              />
            </div>
          </div>
        )}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 7 · Pruebas especiales
// ---------------------------------------------------------------------------
const RESULT_META: Record<TestResult, { label: string; dot: string; selected: string }> = {
  positive: { label: "Positivo", dot: "bg-danger", selected: "bg-danger text-white" },
  negative: { label: "Negativo", dot: "bg-success", selected: "bg-success text-white" },
  inconclusive: { label: "No concluyente", dot: "bg-yellow", selected: "bg-yellow text-ink" },
};

function ResultPicker({
  value,
  onChange,
  error,
  label,
  className,
}: {
  value: TestResult | null;
  onChange: (value: TestResult) => void;
  error?: string | null;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "flex min-h-[54px] items-center gap-1 rounded-[14px] bg-surface p-1.5 shadow-inset",
          error && "shadow-[0_0_0_1.5px_var(--color-danger)]",
        )}
      >
        {TEST_RESULTS.map((r) => {
          const meta = RESULT_META[r];
          const active = value === r;
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(r)}
              className={cn(
                "inline-flex min-h-10 min-w-0 flex-auto items-center justify-center gap-1.5 rounded-[11px] px-2 text-center text-[13px] leading-tight font-medium transition-[background-color,color] duration-150 @min-[820px]:flex-none @min-[820px]:px-3",
                active ? meta.selected : "text-ink-2 hover:bg-surface-2",
              )}
            >
              {!active ? <span aria-hidden className={cn("size-2 shrink-0 rounded-full", meta.dot)} /> : null}
              {meta.label}
            </button>
          );
        })}
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function SpecialTestsSection({ rows, errors, onRowsChange, patch }: RowSectionProps<"special_tests">) {
  const err = (id: string, f: string) => errors[rowErrorKey("special_tests", id, f)];
  const positives = rows.filter((r) => r.result === "positive").length;
  return (
    <>
      <Datalist id="hc-tests" options={SPECIAL_TEST_SUGGESTIONS} />
      {positives > 0 ? (
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-danger-50 px-3 py-1.5 text-[13px] font-medium text-danger">
          <span aria-hidden className="size-2 rounded-full bg-danger" />
          {positives === 1 ? "1 prueba positiva" : `${positives} pruebas positivas`}
        </p>
      ) : null}
      <RowList
        rows={rows}
        onRowsChange={onRowsChange}
        createRow={newTestRow}
        addLabel="Agregar prueba"
        noun={{ one: "prueba", many: "pruebas", removed: "Quitaste una prueba" }}
        icon={<ClipboardList />}
        empty={{
          title: "Sin pruebas especiales",
          description: "Lasègue, Neer, Lachman, Phalen… Elegí de la lista o escribí el nombre de la prueba.",
        }}
        error={errors.special_tests}
        renderRow={({ row, remove, isNew }) => (
          <div className="grid grid-cols-[minmax(0,1fr)_40px] items-start gap-2 [grid-template-areas:'name_del'_'side_side'_'result_result'_'notes_notes'] @lg:grid-cols-[324px_minmax(0,1fr)_128px_40px] @lg:[grid-template-areas:'name_name_side_del'_'result_notes_notes_notes'] @min-[820px]:grid-cols-[minmax(0,1fr)_128px_auto_minmax(0,1fr)_40px] @min-[820px]:[grid-template-areas:'name_side_result_notes_del']">
            <MiniField
              label="Prueba"
              list="hc-tests"
              placeholder="Lasègue"
              maxLength={100}
              autoFocus={isNew}
              value={row.name}
              onChange={(e) => patch(row.id, { name: e.target.value })}
              error={err(row.id, "name")}
              className="[grid-area:name]"
            />
            <div className="flex justify-end [grid-area:del]">{remove}</div>
            <SideSelect
              className="[grid-area:side]"
              value={row.side}
              onChange={(side) => patch(row.id, { side })}
              error={err(row.id, "side")}
            />
            <ResultPicker
              className="[grid-area:result]"
              label={`Resultado${row.name ? ` · ${row.name}` : ""}`}
              value={row.result}
              onChange={(result) => patch(row.id, { result })}
              error={err(row.id, "result")}
            />
            <MiniField
              label="Notas"
              placeholder="Opcional"
              maxLength={300}
              value={row.notes}
              onChange={(e) => patch(row.id, { notes: e.target.value })}
              error={err(row.id, "notes")}
              className="[grid-area:notes]"
            />
          </div>
        )}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 8 · Escalas funcionales
// ---------------------------------------------------------------------------
function ScorePercent({ score, max, className }: { score: string; max: string; className?: string }) {
  const s = parseLocaleNumber(score);
  const m = parseLocaleNumber(max);
  const value = s != null && m != null && m > 0 ? pct(s, m) : null;
  return (
    <div className={cn("flex h-[54px] min-w-0 flex-col justify-center px-3", className)}>
      <p className="text-[11px] leading-none font-medium text-muted">Porcentaje</p>
      <div className="mt-2 flex items-center gap-2.5">
        <span aria-hidden className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
          {value != null ? (
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${value}%` }}
            />
          ) : null}
        </span>
        <span className="tabular w-10 shrink-0 text-right text-[15px] font-medium text-ink">
          {value != null ? `${value}%` : "—"}
        </span>
      </div>
    </div>
  );
}

export function FunctionalScalesSection({
  rows,
  errors,
  onRowsChange,
  patch,
  today,
}: RowSectionProps<"functional_scales"> & { today: string }) {
  const err = (id: string, f: string) => errors[rowErrorKey("functional_scales", id, f)];
  return (
    <>
      <Datalist id="hc-scales" options={FUNCTIONAL_SCALE_SUGGESTIONS} />
      <RowList
        rows={rows}
        onRowsChange={onRowsChange}
        createRow={() => newScaleRow(today)}
        addLabel="Agregar escala"
        noun={{ one: "escala", many: "escalas", removed: "Quitaste una escala" }}
        icon={<Activity />}
        empty={{
          title: "Sin escalas funcionales",
          description: "Oswestry, DASH, WOMAC, Berg… El máximo se completa solo para las escalas conocidas.",
        }}
        error={errors.functional_scales}
        renderRow={({ row, remove, isNew }) => (
          <div className="grid gap-2 @min-[720px]:grid-cols-[minmax(0,1fr)_84px_84px_150px_112px_40px] @min-[720px]:items-start @min-[720px]:[grid-template-areas:'name_score_max_date_pct_del']">
            <div className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 [grid-template-areas:'name_del'] @min-[720px]:contents">
              <MiniField
                label="Escala o cuestionario"
                list="hc-scales"
                placeholder="Oswestry (ODI)"
                maxLength={100}
                autoFocus={isNew}
                value={row.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const known = row.max.trim() === "" ? scaleMaxFor(name) : null;
                  patch(row.id, known != null ? { name, max: String(known) } : { name });
                }}
                error={err(row.id, "name")}
                className="[grid-area:name]"
              />
              <div className="flex justify-end [grid-area:del]">{remove}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 [grid-template-areas:'score_max'_'date_pct'] @lg:grid-cols-[88px_88px_156px_minmax(0,1fr)] @lg:[grid-template-areas:'score_max_date_pct'] @min-[720px]:contents">
              <MiniField
                label="Puntaje"
                inputMode="decimal"
                placeholder="—"
                maxLength={8}
                value={row.score}
                onChange={(e) => patch(row.id, { score: e.target.value })}
                error={err(row.id, "score")}
                className="[grid-area:score]"
                inputClassName="tabular"
              />
              <MiniField
                label="Máximo"
                inputMode="decimal"
                placeholder="—"
                maxLength={8}
                value={row.max}
                onChange={(e) => patch(row.id, { max: e.target.value })}
                error={err(row.id, "max")}
                className="[grid-area:max]"
                inputClassName="tabular"
              />
              <MiniField
                label="Fecha"
                type="date"
                max={today}
                value={row.date}
                onChange={(e) => patch(row.id, { date: e.target.value })}
                error={err(row.id, "date")}
                className="[grid-area:date]"
                inputClassName="tabular"
              />
              <ScorePercent score={row.score} max={row.max} className="[grid-area:pct]" />
            </div>
          </div>
        )}
      />
    </>
  );
}
