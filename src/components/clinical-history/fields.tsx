"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { fieldBase } from "@/components/ui/field";
import { SIDE_OPTIONS } from "@/lib/constants";
import type { Side } from "@/lib/types";
import { cn } from "@/lib/utils";
import { sectionDomId, type SectionMeta } from "@/components/clinical-history/sections";

// ---------------------------------------------------------------------------
// Tarjeta de sección
// ---------------------------------------------------------------------------
export function SectionCard({
  section,
  index,
  hasData,
  errorCount = 0,
  children,
}: {
  section: SectionMeta;
  index: number;
  hasData: boolean;
  errorCount?: number;
  children: ReactNode;
}) {
  const domId = sectionDomId(section.id);
  return (
    <section
      id={domId}
      aria-labelledby={`${domId}-title`}
      data-section={section.id}
      className="scroll-mt-36 rounded-card bg-surface p-5 sm:p-8 lg:scroll-mt-24 xl:scroll-mt-8"
    >
      <header className="mb-6 flex items-start justify-between gap-4 sm:mb-7">
        <div className="min-w-0">
          <p className="tabular text-[13px] font-medium text-subtle">{String(index + 1).padStart(2, "0")}</p>
          <h3
            id={`${domId}-title`}
            tabIndex={-1}
            className="display mt-1 text-[24px] font-medium text-ink outline-none sm:text-[28px]"
          >
            {section.title}
          </h3>
          <p className="mt-1.5 text-sm text-muted">{section.description}</p>
        </div>
        <SectionStatus hasData={hasData} errorCount={errorCount} />
      </header>
      {children}
    </section>
  );
}

function SectionStatus({ hasData, errorCount }: { hasData: boolean; errorCount: number }) {
  // En mobile se compacta a un ícono / número para no apretar el título.
  if (errorCount > 0) {
    return (
      <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-danger-50 px-3 text-[13px] font-medium text-danger">
        <span aria-hidden className="size-1.5 rounded-full bg-danger" />
        <span className="sm:hidden">{errorCount}</span>
        <span className="sr-only sm:not-sr-only">
          {errorCount === 1 ? "1 campo a revisar" : `${errorCount} campos a revisar`}
        </span>
      </span>
    );
  }
  return hasData ? (
    <span className="inline-flex size-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-success-50 text-[13px] font-medium text-success sm:w-auto sm:px-3">
      <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
      <span className="sr-only sm:not-sr-only">Con datos</span>
    </span>
  ) : (
    <span className="hidden h-8 shrink-0 items-center rounded-full bg-surface-2 px-3 text-[13px] font-medium text-muted sm:inline-flex">
      Pendiente
    </span>
  );
}

/** Subtítulo dentro de una sección. */
export function GroupLabel({
  children,
  hint,
  className,
}: {
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1", className)}>
      <p className="text-[15px] font-medium text-ink">{children}</p>
      {hint ? <p className="text-[13px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children?: string | null }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] leading-snug text-danger">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Campos compactos para filas (etiqueta dentro de la caja)
// ---------------------------------------------------------------------------
const miniBox =
  "relative flex h-[54px] min-w-0 flex-col justify-center rounded-[14px] bg-surface px-3 shadow-inset transition-[box-shadow] duration-150 focus-within:shadow-[0_0_0_1.5px_var(--color-ink)]";

type MiniFieldProps = Omit<ComponentProps<"input">, "className"> & {
  label: string;
  error?: string | null;
  suffix?: ReactNode;
  className?: string;
  inputClassName?: string;
};

export function MiniField({ label, error, suffix, className, inputClassName, id, ...props }: MiniFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className={cn("min-w-0", className)}>
      <div className={cn(miniBox, error && "shadow-[0_0_0_1.5px_var(--color-danger)]")}>
        <label htmlFor={inputId} className="truncate text-[11px] leading-none font-medium text-muted">
          {label}
        </label>
        <div className="mt-1 flex items-baseline gap-1">
          <input
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-subtle focus-visible:outline-none",
              inputClassName,
            )}
            {...props}
          />
          {suffix ? <span className="shrink-0 text-sm text-muted">{suffix}</span> : null}
        </div>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

/** Etiquetas completas para el selector (SIDE_OPTIONS usa abreviaturas). */
const SIDE_LABELS: Record<Side, string> = {
  right: "Derecho",
  left: "Izquierdo",
  bilateral: "Bilateral",
  na: "No aplica",
};

export function SideSelect({
  value,
  onChange,
  error,
  className,
  label = "Lado",
}: {
  value: Side;
  onChange: (value: Side) => void;
  error?: string | null;
  className?: string;
  label?: string;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <div className={cn(miniBox, "pr-8", error && "shadow-[0_0_0_1.5px_var(--color-danger)]")}>
        <label htmlFor={id} className="text-[11px] leading-none font-medium text-muted">
          {label}
        </label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as Side)}
          className="mt-1 w-full cursor-pointer appearance-none bg-transparent text-[15px] text-ink outline-none focus-visible:outline-none"
        >
          {SIDE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {SIDE_LABELS[o.value]}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signos vitales: número grande (como el "09:00" de daily)
// ---------------------------------------------------------------------------
export function VitalTile({
  label,
  unit,
  value,
  onChange,
  error,
  placeholder = "—",
  inputMode = "decimal",
  hint,
  maxLength = 6,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  placeholder?: string;
  inputMode?: "decimal" | "numeric" | "text";
  hint?: string;
  maxLength?: number;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex min-w-0 flex-col">
      <div
        className={cn(
          "flex min-h-[112px] flex-1 flex-col justify-between gap-3 rounded-panel bg-surface-2 p-4 transition-[box-shadow,background-color] duration-150 focus-within:bg-surface focus-within:shadow-[0_0_0_1.5px_var(--color-ink)] sm:min-h-[124px] sm:p-5",
          error && "shadow-[0_0_0_1.5px_var(--color-danger)]",
        )}
      >
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-[13px] leading-snug font-medium text-muted">
            {label}
          </label>
          {unit ? <span className="shrink-0 text-[13px] text-subtle">{unit}</span> : null}
        </div>
        <div>
          <input
            id={id}
            type="text"
            inputMode={inputMode}
            autoComplete="off"
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="display tabular w-full min-w-0 bg-transparent text-[32px] font-medium text-ink outline-none placeholder:text-line-strong focus-visible:outline-none sm:text-[38px]"
          />
          {hint ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
        </div>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stepper numérico (horas de sueño, sesiones indicadas)
// ---------------------------------------------------------------------------
export function NumberStepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  unit,
  error,
  decimals = 0,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  min: number;
  max: number;
  unit?: string;
  error?: string | null;
  decimals?: number;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const current = Number(value.replace(",", "."));
  const valid = value.trim() !== "" && Number.isFinite(current);
  const fmt = (n: number) =>
    decimals > 0 ? String(Number(n.toFixed(decimals))).replace(".", ",") : String(Math.round(n));
  const bump = (dir: 1 | -1) => {
    const base = valid ? current : dir === 1 ? min - step : min;
    const next = Math.min(max, Math.max(min, base + dir * step));
    onChange(fmt(next));
  };
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <div
        className={cn(
          "flex h-12 items-center gap-1 rounded-field bg-surface-2 p-1 transition-[box-shadow,background-color] focus-within:bg-surface focus-within:shadow-[0_0_0_1.5px_var(--color-ink)]",
          error && "shadow-[0_0_0_1.5px_var(--color-danger)]",
        )}
      >
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={valid && current <= min}
          aria-label={`Restar ${String(step).replace(".", ",")}`}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] text-ink transition-colors hover:bg-surface-3 disabled:opacity-35"
        >
          <Minus className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            placeholder="—"
            maxLength={5}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="tabular w-full min-w-0 bg-transparent text-center text-[17px] font-medium text-ink outline-none placeholder:text-subtle focus-visible:outline-none"
          />
          {unit ? <span className="shrink-0 pr-1 text-sm text-muted">{unit}</span> : null}
        </div>
        <button
          type="button"
          onClick={() => bump(1)}
          disabled={valid && current >= max}
          aria-label={`Sumar ${String(step).replace(".", ",")}`}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] text-ink transition-colors hover:bg-surface-3 disabled:opacity-35"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contador de caracteres discreto para textos largos
// ---------------------------------------------------------------------------
export function CharCount({ value, max }: { value: string; max: number }) {
  if (value.length < max * 0.8) return null;
  return (
    <span className={cn("tabular text-xs", value.length > max ? "text-danger" : "text-subtle")}>
      {value.length.toLocaleString("es-AR")}/{max.toLocaleString("es-AR")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Texto con etiqueta (input o textarea) + error + contador
// ---------------------------------------------------------------------------
type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  error?: string | null;
  placeholder?: string;
  hint?: string;
  className?: string;
};

export function TextAreaField({
  label,
  value,
  onChange,
  max,
  error,
  placeholder,
  hint,
  className,
  rows = 3,
}: TextFieldProps & { rows?: number }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
        <CharCount value={value} max={max} />
      </div>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        style={{ minHeight: `calc(${rows} * 1.625em + 1.5rem)` }}
        className={cn(fieldBase, "max-h-[28rem] resize-y py-3 leading-relaxed [field-sizing:content]")}
      />
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : hint ? (
        <p className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInputField({
  label,
  value,
  onChange,
  max,
  error,
  placeholder,
  hint,
  className,
  list,
}: TextFieldProps & { list?: string }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        list={list}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(fieldBase, "h-12")}
      />
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : hint ? (
        <p className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
